const express = require("express");
const router = express.Router();
const postsController = require("../controllers/postsController");
const { requireAdmin } = require("../middleware/authMiddleware");

// # Listar posts públicos
router.get("/", postsController.getAllPosts);

// # Listar todos os posts no admin
router.get("/admin/all", requireAdmin, postsController.getAllPostsAdmin);

// # Duplicar artigo (protegido)
router.post("/:id/duplicate", requireAdmin, postsController.duplicatePost);

// # Buscar post público por slug
router.get("/:slug", postsController.getPostBySlug);

// # Criar artigo (protegido)
router.post("/", requireAdmin, postsController.createPost);

// # Atualizar artigo (protegido)
router.put("/:id", requireAdmin, postsController.updatePost);

// # Apagar artigo (protegido)
router.delete("/:id", requireAdmin, postsController.deletePost);

module.exports = router;