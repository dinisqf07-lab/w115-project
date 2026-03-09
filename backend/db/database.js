// # Importar SQLite
const Database = require("better-sqlite3");

// # Criar base de dados (fica guardada em ficheiro)
const db = new Database("database.db");

// # Criar tabela de posts se não existir
db.prepare(`
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT,
  title TEXT,
  excerpt TEXT
)
`).run();

// # Adicionar coluna content se ainda não existir
try {
  db.prepare(`
    ALTER TABLE posts ADD COLUMN content TEXT
  `).run();
} catch (error) {
  // # Ignora erro se a coluna já existir
}

// # Exportar base de dados
module.exports = db;