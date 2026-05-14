// # Criar post
exports.createPost = async (postData) => {
  const result = await db.execute({
    sql: `INSERT INTO posts (slug, title, excerpt, content, title_en, excerpt_en, content_en, status, cover_image, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
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
    ]
  });
  return { lastInsertRowid: Number(result.lastInsertRowid) };
};

// # Duplicar post
exports.duplicatePost = async (id, newSlug) => {
  const post = await exports.getPostById(id);
  if (!post) return null;

  const result = await db.execute({
    sql: `INSERT INTO posts (slug, title, excerpt, content, title_en, excerpt_en, content_en, status, cover_image, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, null)`,
    args: [
      newSlug,
      `${post.title} (Cópia)`,
      post.excerpt,
      post.content,
      post.title_en,
      post.excerpt_en,
      post.content_en,
      post.cover_image || null
    ]
  });
  return { lastInsertRowid: Number(result.lastInsertRowid) };
};