// # Importações
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db/database");
db.prepare("DELETE FROM posts").run();
db.prepare(`
INSERT INTO posts (slug, title, excerpt)
VALUES
('historia-classe-e', 'História da Classe E', 'A série W114/W115 foi um marco na história da Mercedes-Benz.'),
('restauro-220d', 'Restauro do 220D 1974', 'O processo completo de restauro de um Mercedes clássico.')
`).run();

// # Criar app
const app = express();

// # Middleware
app.use(cors());
app.use(express.json());


// # Rota para listar artigos
app.get("/api/posts", (req, res) => {

  const posts = db.prepare(`
    SELECT * FROM posts
  `).all();

  res.json(posts);

});


// # Rota para criar um novo artigo
app.post("/api/posts", (req, res) => {
  const { slug, title, excerpt, content } = req.body;

  // # Validação simples
  if (!slug || !title || !excerpt || !content) {
    return res.status(400).json({
      ok: false,
      message: "Slug, título, resumo e conteúdo são obrigatórios."
    });
  }

  // # Inserir na base de dados
  const stmt = db.prepare(`
    INSERT INTO posts (slug, title, excerpt, content)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(slug, title, excerpt, content);

  // # Devolver resposta
  res.status(201).json({
    ok: true,
    message: "Post criado com sucesso.",
    id: result.lastInsertRowid
  });
});

// # Porta
const PORT = process.env.PORT || 5000;

// # Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});

// # Apagar artigo
app.delete("/api/posts/:id", (req, res) => {

  const id = req.params.id;

  const stmt = db.prepare(`
    DELETE FROM posts WHERE id = ?
  `);

  const result = stmt.run(id);

  if (result.changes === 0) {
    return res.status(404).json({
      ok: false,
      message: "Post não encontrado."
    });
  }

  res.json({
    ok: true,
    message: "Post apagado com sucesso."
  });

});~


// # Atualizar artigo
app.put("/api/posts/:id", (req, res) => {
  const id = req.params.id;
  const { slug, title, excerpt, content } = req.body;

  if (!slug || !title || !excerpt || !content) {
    return res.status(400).json({
      ok: false,
      message: "Slug, título, resumo e conteúdo são obrigatórios."
    });
  }

  const stmt = db.prepare(`
    UPDATE posts
    SET slug = ?, title = ?, excerpt = ?, content = ?
    WHERE id = ?
  `);

  const result = stmt.run(slug, title, excerpt, content, id);

  if (result.changes === 0) {
    return res.status(404).json({
      ok: false,
      message: "Post não encontrado."
    });
  }

  res.json({
    ok: true,
    message: "Post atualizado com sucesso."
  });
});