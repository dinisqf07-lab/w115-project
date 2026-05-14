const db = require("../db/database");

exports.getAllPosts = async () => {
  const result = await db.execute(`SELECT * FROM posts ORDER BY id DESC`);
  return result.rows;
};

exports.getPublishedPosts = async () => {
  const result = await db.execute(`
    SELECT * FROM posts
    WHERE status = 'published'
    ORDER BY
      CASE WHEN published_at IS NULL THEN 1 ELSE 0 END,
      published_at DESC,
      id DESC
  `);
  return result.rows;
};

exports.getPostBySlug = async (slug) => {
  const result = await db.execute({ sql: `SELECT id FROM posts WHERE slug = ?`, args: [slug] });
  return result.rows[0] || null;
};

exports.getPostBySlugExcludingId = async (slug, id) => {
  const result = await db.execute({ sql: `SELECT id FROM posts WHERE slug = ? AND id != ?`, args: [slug, id] });
  return result.rows[0] || null;
};

exports.getPostById = async (id) => {
  const result = await db.execute({ sql: `SELECT * FROM posts WHERE id = ?`, args: [id] });
  return result.rows[0] || null;
};

exports.createPost = async (postData) => {
  const result = await db.execute({
    sql: `INSERT INTO posts (slug, title, excerpt, content, title_en, excerpt_en, content_en, status, cover_image, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [postData.slug, postData.title, postData.excerpt, postData.content, postData.title_en, postData.excerpt_en, postData.content_en, postData.status || "draft", postData.cover_image || null, postData.published_at || null]
  });
  return { lastInsertRowid: Number(result.lastInsertRowid) };
};

exports.updatePost = async (id, postData) => {
  const result = await db.execute({
    sql: `UPDATE posts SET slug=?, title=?, excerpt=?, content=?, title_en=?, excerpt_en=?, content_en=?, status=?, cover_image=?, published_at=? WHERE id=?`,
    args: [postData.slug, postData.title, postData.excerpt, postData.content, postData.title_en, postData.excerpt_en, postData.content_en, postData.status || "draft", postData.cover_image || null, postData.published_at || null, id]
  });
  return { changes: result.rowsAffected };
};

exports.duplicatePost = async (id, newSlug) => {
  const post = await exports.getPostById(id);
  if (!post) return null;
  const result = await db.execute({
    sql: `INSERT INTO posts (slug, title, excerpt, content, title_en, excerpt_en, content_en, status, cover_image, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, null)`,
    args: [newSlug, `${post.title} (Cópia)`, post.excerpt, post.content, post.title_en, post.excerpt_en, post.content_en, post.cover_image || null]
  });
  return { lastInsertRowid: Number(result.lastInsertRowid) };
};

exports.deletePost = async (id) => {
  const result = await db.execute({ sql: `DELETE FROM posts WHERE id = ?`, args: [id] });
  return { changes: result.rowsAffected };
};

exports.getPostBySlugFull = async (slug) => {
  const result = await db.execute({ sql: `SELECT * FROM posts WHERE slug = ?`, args: [slug] });
  return result.rows[0] || null;
};

exports.getPublishedPostBySlug = async (slug) => {
  const result = await db.execute({ sql: `SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1`, args: [slug] });
  return result.rows[0] || null;
};