const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// # Nome do cookie
const COOKIE_NAME = "admin_token";

// # Proteger rotas de admin
exports.requireAdmin = (req, res, next) => {
  try {
    // # Verificar se existe JWT_SECRET
    if (!process.env.JWT_SECRET) {
      logger.error("AUTH_CONFIG_ERROR", {
        message: "Falta JWT_SECRET no ambiente.",
        ip: req.ip,
        route: req.originalUrl
      });

      return res.status(500).json({
        ok: false,
        message: "Erro de configuração do servidor."
      });
    }

    const token = req.cookies?.[COOKIE_NAME];

    // # Sem token = não autenticado
    if (!token) {
      logger.warn("AUTH_MISSING_TOKEN", {
        ip: req.ip,
        route: req.originalUrl
      });

      return res.status(401).json({
        ok: false,
        message: "Não autenticado."
      });
    }

    // # Verificar e validar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "mercedes-w115-api",
      audience: "mercedes-w115-admin",
      algorithms: ["HS256"]
    });

    // # Validar conteúdo esperado do token
    if (!decoded || decoded.role !== "admin" || decoded.sub !== "admin") {
      logger.warn("AUTH_INVALID_ROLE", {
        ip: req.ip,
        route: req.originalUrl,
        role: decoded?.role || null,
        sub: decoded?.sub || null
      });

      return res.status(403).json({
        ok: false,
        message: "Acesso negado."
      });
    }

    // # Guardar dados mínimos do admin no request
    req.admin = {
      role: decoded.role,
      sub: decoded.sub
    };

    return next();
  } catch (error) {
    logger.warn("AUTH_INVALID_SESSION", {
      ip: req.ip,
      route: req.originalUrl,
      errorName: error.name,
      errorMessage: error.message
    });

    return res.status(401).json({
      ok: false,
      message: "Sessão inválida ou expirada."
    });
  }
};