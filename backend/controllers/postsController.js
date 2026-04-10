// # Importar model
const postModel = require("../models/postModel");

// # Importar sanitizador HTML
const cleanHtml = require("../utils/sanitizeHtml");
const logger = require("../utils/logger");

// # Validar dados de um post
function validarPostData({
  slug,
  title,
  excerpt,
  content,
  status,
  cover_image,
  published_at
}) {
  if (!slug || !title || !excerpt || !content) {
    return "Slug, título, resumo e conteúdo são obrigatórios.";
  }

  // # Limpar espaços
  const slugLimpo = slug.trim();
  const titleLimpo = title.trim();
  const excerptLimpo = excerpt.trim();
  const contentLimpo = content.trim();
  const statusLimpo = (status || "draft").trim();
  const coverImageLimpa = (cover_image || "").trim();
  const publishedAtLimpo = (published_at || "").trim();

  if (slugLimpo.length < 3) {
    return "O slug deve ter pelo menos 3 caracteres.";
  }

  if (slugLimpo.length > 180) {
    return "O slug não pode ter mais de 180 caracteres.";
  }

  if (!/^[a-z0-9-]+$/.test(slugLimpo)) {
    return "O slug só pode ter letras minúsculas, números e hífen.";
  }

  if (titleLimpo.length < 3) {
    return "O título deve ter pelo menos 3 caracteres.";
  }

  if (titleLimpo.length > 150) {
    return "O título não pode ter mais de 150 caracteres.";
  }

  if (excerptLimpo.length < 10) {
    return "O resumo deve ter pelo menos 10 caracteres.";
  }

  if (excerptLimpo.length > 300) {
    return "O resumo não pode ter mais de 300 caracteres.";
  }

  // # Remove tags HTML para avaliar conteúdo real
  const textoSemHtml = contentLimpo.replace(/<[^>]*>/g, "").trim();

  if (textoSemHtml.length < 3) {
    return "O conteúdo do artigo é demasiado curto.";
  }

  // # Validar status
  if (!["draft", "published"].includes(statusLimpo)) {
    return "O status do artigo é inválido.";
  }

  // # Validar imagem de capa
  if (coverImageLimpa) {
    if (coverImageLimpa.length > 500) {
      return "O campo da imagem de capa é demasiado grande.";
    }

    const isLocalUpload = /^\/?uploads\/[a-zA-Z0-9._\-]+$/.test(coverImageLimpa);
    const isAbsoluteUploadUrl = /^https?:\/\/[^/]+\/uploads\/[a-zA-Z0-9._\-]+$/.test(coverImageLimpa);

    if (!isLocalUpload && !isAbsoluteUploadUrl) {
      return "A imagem de capa tem um formato inválido.";
    }
  }

  // # Validar published_at apenas se vier preenchido
  if (publishedAtLimpo) {
    const data = new Date(publishedAtLimpo);

    if (Number.isNaN(data.getTime())) {
      return "A data de publicação é inválida.";
    }
  }

  return null;
}

// # Validar slug vindo da URL
function validarSlugParam(slug) {
  if (typeof slug !== "string") return false;
  const slugLimpo = slug.trim();

  if (slugLimpo.length < 3 || slugLimpo.length > 180) return false;
  return /^[a-z0-9-]+$/.test(slugLimpo);
}

// # Gerar slug de cópia
function gerarSlugDuplicado(slugOriginal) {
  return `${slugOriginal}-copia-${Date.now()}`;
}

// # Resolver data de publicação
function resolverPublishedAt(status, published_at, valorAtual = null) {
  const statusLimpo = (status || "draft").trim();
  const publishedAtLimpo = (published_at || "").trim();

  // # Se estiver em rascunho, não deve ter data de publicação
  if (statusLimpo === "draft") {
    return null;
  }

  // # Se veio uma data manual, usa essa
  if (publishedAtLimpo) {
    return new Date(publishedAtLimpo).toISOString();
  }

  // # Se já existia uma data anterior, mantém
  if (valorAtual) {
    return valorAtual;
  }

  // # Se foi publicado agora e não veio data, gera automaticamente
  return new Date().toISOString();
}

// # Listar posts públicos
exports.getAllPosts = (req, res) => {
  try {
    // # Idealmente este método no model já deve devolver apenas publicados
    const posts = postModel.getPublishedPosts
      ? postModel.getPublishedPosts()
      : postModel.getAllPosts().filter((post) => post.status === "published");

    return res.json(posts);
  } catch (error) {
    logger.error("POSTS_LIST_PUBLIC_ERROR", {
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao listar os artigos."
    });
  }
};

// # Listar todos os posts para admin
exports.getAllPostsAdmin = (req, res) => {
  try {
    const posts = postModel.getAllPosts();
    return res.json(posts);
  } catch (error) {
    logger.error("POSTS_LIST_ADMIN_ERROR", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao listar os artigos."
    });
  }
};

// # Criar novo post
exports.createPost = (req, res) => {
  try {
    const {
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
    } = req.body;

    // # Sanitizar HTML antes de validar/guardar
    const contentSeguro = cleanHtml(content || "");
    const contentEnSeguro = cleanHtml(content_en || "");

    // # Validar dados com base no conteúdo já limpo
    const erroValidacao = validarPostData({
      slug,
      title,
      excerpt,
      content: contentSeguro,
      status,
      cover_image,
      published_at
    });

    if (erroValidacao) {
      logger.warn("POST_CREATE_VALIDATION_FAILED", {
        admin: req.admin?.sub || "admin",
        ip: req.ip,
        message: erroValidacao
      });

      return res.status(400).json({
        ok: false,
        message: erroValidacao
      });
    }

    const slugLimpo = slug.trim();

    // # Verificar se o slug já existe
    const existingPost = postModel.getPostBySlug(slugLimpo);

    if (existingPost) {
      logger.warn("POST_CREATE_DUPLICATE_SLUG", {
        slug: slugLimpo,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "Já existe um artigo com esse slug."
      });
    }

    const statusLimpo = (status || "draft").trim();
    const publishedAtFinal = resolverPublishedAt(statusLimpo, published_at);

    const result = postModel.createPost({
      slug: slugLimpo,
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: contentSeguro.trim(),
      title_en: (title_en || "").trim(),
      excerpt_en: (excerpt_en || "").trim(),
      content_en: contentEnSeguro.trim(),
      status: statusLimpo,
      cover_image: (cover_image || "").trim() || null,
      published_at: publishedAtFinal
    });

    logger.log("POST_CREATED", {
      id: result.lastInsertRowid,
      slug: slugLimpo,
      status: statusLimpo,
      admin: req.admin?.sub || "admin",
      ip: req.ip
    });

    return res.status(201).json({
      ok: true,
      message: "Post criado com sucesso.",
      id: result.lastInsertRowid
    });
  } catch (error) {
    logger.error("POST_CREATE_ERROR", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao criar o artigo."
    });
  }
};

// # Atualizar post
exports.updatePost = (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      logger.warn("POST_UPDATE_INVALID_ID", {
        id: req.params.id,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "ID inválido."
      });
    }

    const postAtual = postModel.getPostById(id);

    if (!postAtual) {
      logger.warn("POST_UPDATE_NOT_FOUND", {
        id,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(404).json({
        ok: false,
        message: "Post não encontrado."
      });
    }

    const {
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
    } = req.body;

    const contentSeguro = cleanHtml(content || "");
    const contentEnSeguro = cleanHtml(content_en || "");

    const erroValidacao = validarPostData({
      slug,
      title,
      excerpt,
      content: contentSeguro,
      status,
      cover_image,
      published_at
    });

    if (erroValidacao) {
      logger.warn("POST_UPDATE_VALIDATION_FAILED", {
        id,
        admin: req.admin?.sub || "admin",
        ip: req.ip,
        message: erroValidacao
      });

      return res.status(400).json({
        ok: false,
        message: erroValidacao
      });
    }

    const slugLimpo = slug.trim();

    const slugExists = postModel.getPostBySlugExcludingId(slugLimpo, id);

    if (slugExists) {
      logger.warn("POST_UPDATE_DUPLICATE_SLUG", {
        id,
        slug: slugLimpo,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "Já existe outro artigo com esse slug."
      });
    }

    const statusLimpo = (status || "draft").trim();
    const publishedAtFinal = resolverPublishedAt(
      statusLimpo,
      published_at,
      postAtual.published_at
    );

    const result = postModel.updatePost(id, {
      slug: slugLimpo,
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: contentSeguro.trim(),
      title_en: (title_en || "").trim(),
      excerpt_en: (excerpt_en || "").trim(),
      content_en: contentEnSeguro.trim(),
      status: statusLimpo,
      cover_image: (cover_image || "").trim() || null,
      published_at: publishedAtFinal
    });

    if (result.changes === 0) {
      logger.warn("POST_UPDATE_NO_CHANGES", {
        id,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(404).json({
        ok: false,
        message: "Post não encontrado."
      });
    }

    logger.log("POST_UPDATED", {
      id,
      slug: slugLimpo,
      status: statusLimpo,
      admin: req.admin?.sub || "admin",
      ip: req.ip
    });

    return res.json({
      ok: true,
      message: "Post atualizado com sucesso."
    });
  } catch (error) {
    logger.error("POST_UPDATE_ERROR", {
      id: req.params.id,
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao atualizar o artigo."
    });
  }
};

// # Duplicar post
exports.duplicatePost = (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      logger.warn("POST_DUPLICATE_INVALID_ID", {
        id: req.params.id,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "ID inválido."
      });
    }

    const postAtual = postModel.getPostById(id);

    if (!postAtual) {
      logger.warn("POST_DUPLICATE_NOT_FOUND", {
        id,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(404).json({
        ok: false,
        message: "Post não encontrado."
      });
    }

    const novoSlug = gerarSlugDuplicado(postAtual.slug);

    // # Idealmente o model deve duplicar como draft e published_at null
    const result = postModel.duplicatePost(id, novoSlug);

    if (!result) {
      logger.warn("POST_DUPLICATE_FAILED", {
        id,
        newSlug: novoSlug,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(404).json({
        ok: false,
        message: "Não foi possível duplicar o post."
      });
    }

    logger.log("POST_DUPLICATED", {
      originalId: id,
      newId: result.lastInsertRowid,
      newSlug: novoSlug,
      admin: req.admin?.sub || "admin",
      ip: req.ip
    });

    return res.status(201).json({
      ok: true,
      message: "Post duplicado com sucesso.",
      id: result.lastInsertRowid,
      slug: novoSlug
    });
  } catch (error) {
    logger.error("POST_DUPLICATE_ERROR", {
      id: req.params.id,
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao duplicar o artigo."
    });
  }
};

// # Apagar post
exports.deletePost = (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      logger.warn("POST_DELETE_INVALID_ID", {
        id: req.params.id,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "ID inválido."
      });
    }

    const result = postModel.deletePost(id);

    if (result.changes === 0) {
      logger.warn("POST_DELETE_NOT_FOUND", {
        id,
        admin: req.admin?.sub || "admin",
        ip: req.ip
      });

      return res.status(404).json({
        ok: false,
        message: "Post não encontrado."
      });
    }

    logger.log("POST_DELETED", {
      id,
      admin: req.admin?.sub || "admin",
      ip: req.ip
    });

    return res.json({
      ok: true,
      message: "Post apagado com sucesso."
    });
  } catch (error) {
    logger.error("POST_DELETE_ERROR", {
      id: req.params.id,
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao apagar o artigo."
    });
  }
};

// # Buscar um post público por slug
exports.getPostBySlug = (req, res) => {
  try {
    const slug = req.params.slug;

    if (!validarSlugParam(slug)) {
      logger.warn("POST_GET_BY_SLUG_INVALID", {
        slug,
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "Slug inválido."
      });
    }

    // # Idealmente este método no model já deve devolver apenas publicados
    const post = postModel.getPublishedPostBySlug
      ? postModel.getPublishedPostBySlug(slug.trim())
      : (() => {
          const found = postModel.getPostBySlugFull(slug.trim());
          if (!found || found.status !== "published") return null;
          return found;
        })();

    if (!post) {
      logger.warn("POST_GET_BY_SLUG_NOT_FOUND", {
        slug: slug.trim(),
        ip: req.ip
      });

      return res.status(404).json({
        ok: false,
        message: "Post não encontrado."
      });
    }

    return res.json(post);
  } catch (error) {
    logger.error("POST_GET_BY_SLUG_ERROR", {
      slug: req.params.slug,
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao buscar o artigo."
    });
  }
};