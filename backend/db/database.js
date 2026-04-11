// # Importar biblioteca SQLite
const Database = require("better-sqlite3");

// # Criar ligação à base de dados
const db = new Database("./db/database.db");

// # Melhor desempenho e segurança básica
db.pragma("journal_mode = WAL");

// # Criar tabela posts se ainda não existir
db.prepare(`
  CREATE TABLE IF NOT EXISTS posts (
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
  )
`).run();

// # Criar tabela contacts se ainda não existir
db.prepare(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    type TEXT,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// # Função para verificar se uma coluna existe
function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((col) => col.name === columnName);
}

// # Adicionar colunas novas se faltarem
if (!hasColumn("posts", "status")) {
  db.prepare(`
    ALTER TABLE posts
    ADD COLUMN status TEXT DEFAULT 'draft'
  `).run();
}

if (!hasColumn("posts", "cover_image")) {
  db.prepare(`
    ALTER TABLE posts
    ADD COLUMN cover_image TEXT
  `).run();
}

if (!hasColumn("posts", "published_at")) {
  db.prepare(`
    ALTER TABLE posts
    ADD COLUMN published_at TEXT
  `).run();
}

// # No SQLite, ALTER TABLE não aceita DEFAULT CURRENT_TIMESTAMP
if (!hasColumn("posts", "created_at")) {
  db.prepare(`
    ALTER TABLE posts
    ADD COLUMN created_at TEXT
  `).run();
}

if (!hasColumn("posts", "updated_at")) {
  db.prepare(`
    ALTER TABLE posts
    ADD COLUMN updated_at TEXT
  `).run();
}

// # Garantir coluna is_read na tabela contacts
if (!hasColumn("contacts", "is_read")) {
  db.prepare(`
    ALTER TABLE contacts
    ADD COLUMN is_read INTEGER DEFAULT 0
  `).run();
}

// # Garantir coluna created_at na tabela contacts
if (!hasColumn("contacts", "created_at")) {
  db.prepare(`
    ALTER TABLE contacts
    ADD COLUMN created_at TEXT
  `).run();
}

// # Exportar ligação
module.exports = db;