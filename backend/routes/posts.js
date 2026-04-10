// # Router dos posts
const express = require("express");
const router = express.Router();

// # Dados de teste
const posts = [
  {
    id: 1,
    slug: "historia-classe-e",
    title: "História Classe E",
    excerpt: "Da série 200 ao legado que viria a influenciar a Classe E.",
    content: "Conteúdo completo do artigo História Classe E."
  },
  {
    id: 2,
    slug: "restauro-220d-1974",
    title: "Restauro 220D (1974)",
    excerpt: "Fotos, decisões, problemas e soluções — do início ao detalhe final.",
    content: "Conteúdo completo do artigo Restauro 220D."
  },
  {
    id: 3,
    slug: "restauro-240d-30-1976",
    title: "Restauro 240D 3.0 (1976)",
    excerpt: "A versão longa e tudo o que muda na prática: conforto, mecânica e detalhes.",
    content: "Conteúdo completo do artigo Restauro 240D 3.0."
  }
];

// # GET /api/posts
router.get("/", (req, res) => {
  res.json(posts);
});

module.exports = router;