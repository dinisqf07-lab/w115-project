import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";

// # CORS headers
function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.FRONTEND_URL || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(data, status = 200, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(env), "Content-Type": "application/json" },
  });
}

// # Ligar ao Turso
function getDb(env) {
  return createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_TOKEN,
  });
}

// # Verificar JWT
function verificarToken(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), env.JWT_SECRET, {
      issuer: "mercedes-w115-api",
      audience: "mercedes-w115-admin",
    });
  } catch {
    return null;
  }
}

// # Sanitização básica de HTML (remove tags perigosas)
function cleanHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

// # Validar slug
function validarSlug(slug) {
  if (typeof slug !== "string") return false;
  const s = slug.trim();
  return s.length >= 3 && s.length <= 180 && /^[a-z0-9-]+$/.test(s);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // # CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }

    const db = getDb(env);

    // ─── AUTH ───────────────────────────────────────────

    // # POST /api/auth/login
    if (path === "/api/auth/login" && method === "POST") {
      const { password } = await request.json();
      if (!password || password.length > 200) {
        return json({ ok: false, message: "Password obrigatória." }, 400, env);
      }

      const { default: bcrypt } = await import("bcryptjs");
      const ok = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
      if (!ok) return json({ ok: false, message: "Credenciais inválidas." }, 401, env);

      const token = jwt.sign(
        { sub: "admin", role: "admin" },
        env.JWT_SECRET,
        { expiresIn: "12h", issuer: "mercedes-w115-api", audience: "mercedes-w115-admin" }
      );

      return json({ ok: true, token }, 200, env);
    }

    // # POST /api/auth/logout
    if (path === "/api/auth/logout" && method === "POST") {
      return json({ ok: true, message: "Logout efetuado." }, 200, env);
    }

    // # GET /api/auth/me
    if (path === "/api/auth/me" && method === "GET") {
      const admin = verificarToken(request, env);
      if (!admin) return json({ ok: false, message: "Não autenticado." }, 401, env);
      return json({ ok: true, authenticated: true, admin: { role: admin.role } }, 200, env);
    }

    // ─── POSTS PÚBLICOS ──────────────────────────────────

    // # GET /api/posts
    if (path === "/api/posts" && method === "GET") {
      const result = await db.execute(`
        SELECT * FROM posts WHERE status = 'published'
        ORDER BY CASE WHEN published_at IS NULL THEN 1 ELSE 0 END, published_at DESC, id DESC
      `);
      return json(result.rows, 200, env);
    }

    // # GET /api/posts/:slug
    const slugMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (slugMatch && method === "GET") {
      const slug = slugMatch[1];
      if (!validarSlug(slug)) return json({ ok: false, message: "Slug inválido." }, 400, env);
      const result = await db.execute({
        sql: `SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1`,
        args: [slug],
      });
      if (!result.rows[0]) return json({ ok: false, message: "Post não encontrado." }, 404, env);
      return json(result.rows[0], 200, env);
    }

    // ─── ADMIN POSTS ─────────────────────────────────────

    // # GET /api/admin/posts
    if (path === "/api/admin/posts" && method === "GET") {
      const admin = verificarToken(request, env);
      if (!admin) return json({ ok: false, message: "Não autenticado." }, 401, env);
      const result = await db.execute(`SELECT * FROM posts ORDER BY id DESC`);
      return json(result.rows, 200, env);
    }

    // # POST /api/admin/posts
    if (path === "/api/admin/posts" && method === "POST") {
      const admin = verificarToken(request, env);
      if (!admin) return json({ ok: false, message: "Não autenticado." }, 401, env);

      const body = await request.json();
      const { slug, title, excerpt, content, title_en, excerpt_en, content_en, status, cover_image, published_at } = body;
      const contentSeguro = cleanHtml(content || "");

      if (!slug || !title || !excerpt || !contentSeguro) {
        return json({ ok: false, message: "Slug, título, resumo e conteúdo são obrigatórios." }, 400, env);
      }

      const statusFinal = (status || "draft").trim();
      const publishedAtFinal = statusFinal === "draft" ? null : (published_at || new Date().toISOString());

      const exists = await db.execute({ sql: `SELECT id FROM posts WHERE slug = ?`, args: [slug.trim()] });
      if (exists.rows[0]) return json({ ok: false, message: "Já existe um artigo com esse slug." }, 400, env);

      const result = await db.execute({
        sql: `INSERT INTO posts (slug, title, excerpt, content, title_en, excerpt_en, content_en, status, cover_image, published_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [slug.trim(), title.trim(), excerpt.trim(), contentSeguro.trim(), (title_en||"").trim(), (excerpt_en||"").trim(), cleanHtml(content_en||"").trim(), statusFinal, (cover_image||"").trim()||null, publishedAtFinal],
      });

      return json({ ok: true, message: "Post criado.", id: Number(result.lastInsertRowid) }, 201, env);
    }

    // # PUT /api/admin/posts/:id
    const adminPostMatch = path.match(/^\/api\/admin\/posts\/(\d+)$/);
    if (adminPostMatch && method === "PUT") {
      const admin = verificarToken(request, env);
      if (!admin) return json({ ok: false, message: "Não autenticado." }, 401, env);

      const id = Number(adminPostMatch[1]);
      const body = await request.json();
      const { slug, title, excerpt, content, title_en, excerpt_en, content_en, status, cover_image, published_at } = body;
      const contentSeguro = cleanHtml(content || "");

      const postAtual = await db.execute({ sql: `SELECT * FROM posts WHERE id = ?`, args: [id] });
      if (!postAtual.rows[0]) return json({ ok: false, message: "Post não encontrado." }, 404, env);

      const statusFinal = (status || "draft").trim();
      const publishedAtFinal = statusFinal === "draft" ? null : (published_at || postAtual.rows[0].published_at || new Date().toISOString());

      const slugExists = await db.execute({ sql: `SELECT id FROM posts WHERE slug = ? AND id != ?`, args: [slug.trim(), id] });
      if (slugExists.rows[0]) return json({ ok: false, message: "Já existe outro artigo com esse slug." }, 400, env);

      const result = await db.execute({
        sql: `UPDATE posts SET slug=?, title=?, excerpt=?, content=?, title_en=?, excerpt_en=?, content_en=?, status=?, cover_image=?, published_at=? WHERE id=?`,
        args: [slug.trim(), title.trim(), excerpt.trim(), contentSeguro.trim(), (title_en||"").trim(), (excerpt_en||"").trim(), cleanHtml(content_en||"").trim(), statusFinal, (cover_image||"").trim()||null, publishedAtFinal, id],
      });

      if (result.rowsAffected === 0) return json({ ok: false, message: "Post não encontrado." }, 404, env);
      return json({ ok: true, message: "Post atualizado." }, 200, env);
    }

    // # DELETE /api/admin/posts/:id
    if (adminPostMatch && method === "DELETE") {
      const admin = verificarToken(request, env);
      if (!admin) return json({ ok: false, message: "Não autenticado." }, 401, env);

      const id = Number(adminPostMatch[1]);
      const result = await db.execute({ sql: `DELETE FROM posts WHERE id = ?`, args: [id] });
      if (result.rowsAffected === 0) return json({ ok: false, message: "Post não encontrado." }, 404, env);
      return json({ ok: true, message: "Post apagado." }, 200, env);
    }

    // # 404
    return json({ ok: false, message: "Rota não encontrada." }, 404, env);
  },
};