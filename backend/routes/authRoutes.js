const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// # Saber se está em produção
const isProduction = process.env.NODE_ENV === "production";

// # Limiter para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    ok: false,
    message: "Demasiadas tentativas de autenticação. Tenta novamente daqui a pouco."
  }
});

// # Limiter para rotas de sessão autenticada
const sessionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    ok: false,
    message: "Demasiados pedidos relacionados com a sessão."
  }
});

// # Login do admin
router.post("/login", loginLimiter, authController.loginAdmin);

// # Logout
router.post("/logout", requireAdmin, sessionLimiter, authController.logoutAdmin);

// # Verificar sessão atual
router.get("/me", requireAdmin, sessionLimiter, authController.getMe);

module.exports = router;