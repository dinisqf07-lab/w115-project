const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// # Criar tabelas se não existirem
async function inicializarDB() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      title_en TEXT,
      excerpt_en TEXT,
      content_en TEXT,
      status TEXT DEFAULT 'draft',
      cover_image TEXT,
      published_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      type TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ], "write");

  console.log("Turso DB inicializada.");
}

inicializarDB().catch((err) => {
  console.error("Erro ao inicializar DB:", err);
  process.exit(1);
});

module.exports = db;