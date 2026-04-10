// # Importar ligação à base de dados
const db = require("../db/database");

// # Buscar todos os posts
exports.getAllPosts = () => {
  return db.prepare(`
    SELECT *
    FROM posts
    ORDER BY id DESC
  `).all();
};

// # Buscar apenas posts publicados
exports.getPublishedPosts = () => {
  return db.prepare(`
    SELECT *
    FROM posts
    WHERE status = 'published'
    ORDER BY
      CASE
        WHEN published_at IS NULL THEN 1
        ELSE 0
      END,
      published_at DESC,
      id DESC
  `).all();
};

// # Buscar apenas id por slug
exports.getPostBySlug = (slug) => {
  return db.prepare(`
    SELECT id
    FROM posts
    WHERE slug = ?
  `).get(slug);
};

// # Buscar slug excluindo um id
exports.getPostBySlugExcludingId = (slug, id) => {
  return db.prepare(`
    SELECT id
    FROM posts
    WHERE slug = ? AND id != ?
  `).get(slug, id);
};

// # Buscar post por id
exports.getPostById = (id) => {
  return db.prepare(`
    SELECT *
    FROM posts
    WHERE id = ?
  `).get(id);
};

// # Criar post
exports.createPost = (postData) => {
  const stmt = db.prepare(`
    INSERT INTO posts (
      slug,
      title,
      excerpt,
      content,
      title_en,
      excerpt_en,
      content_en,
      status,
      cover_image,
      published_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    postData.slug,
    postData.title,
    postData.excerpt,
    postData.content,
    postData.title_en,
    postData.excerpt_en,
    postData.content_en,
    postData.status || "draft",
    postData.cover_image || null,
    postData.published_at || null
  );
};

// # Atualizar post
exports.updatePost = (id, postData) => {
  const stmt = db.prepare(`
    UPDATE posts
    SET
      slug = ?,
      title = ?,
      excerpt = ?,
      content = ?,
      title_en = ?,
      excerpt_en = ?,
      content_en = ?,
      status = ?,
      cover_image = ?,
      published_at = ?
    WHERE id = ?
  `);

  return stmt.run(
    postData.slug,
    postData.title,
    postData.excerpt,
    postData.content,
    postData.title_en,
    postData.excerpt_en,
    postData.content_en,
    postData.status || "draft",
    postData.cover_image || null,
    postData.published_at || null,
    id
  );
};

// # Duplicar post
exports.duplicatePost = (id, newSlug) => {
  const post = db.prepare(`
    SELECT *
    FROM posts
    WHERE id = ?
  `).get(id);

  if (!post) {
    return null;
  }

  const stmt = db.prepare(`
    INSERT INTO posts (
      slug,
      title,
      excerpt,
      content,
      title_en,
      excerpt_en,
      content_en,
      status,
      cover_image,
      published_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    newSlug,
    `${post.title} (Cópia)`,
    post.excerpt,
    post.content,
    post.title_en,
    post.excerpt_en,
    post.content_en,
    "draft",
    post.cover_image || null,
    null
  );
};

// # Apagar post
exports.deletePost = (id) => {
  const stmt = db.prepare(`
    DELETE FROM posts
    WHERE id = ?
  `);

  return stmt.run(id);
};

// # Buscar post completo por slug
exports.getPostBySlugFull = (slug) => {
  return db.prepare(`
    SELECT *
    FROM posts
    WHERE slug = ?
  `).get(slug);
};

// # Buscar post publicado por slug
exports.getPublishedPostBySlug = (slug) => {
  return db.prepare(`
    SELECT *
    FROM posts
    WHERE slug = ?
      AND status = 'published'
    LIMIT 1
  `).get(slug);
};