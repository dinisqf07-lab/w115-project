const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");

// # Nome do cookie
const COOKIE_NAME = "admin_token";

// # Saber se está em produção
const isProduction = process.env.NODE_ENV === "production";

// # Gera as opções do cookie de forma centralizada
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000, // # 12 horas
    path: "/"
  };
}

// # Gera as opções para limpar o cookie
function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
  };
}

// # Login de admin com password em hash + cookie seguro
exports.loginAdmin = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { password } = body;

    // # Validar password
    if (typeof password !== "string" || password.trim().length === 0) {
      logger.warn("LOGIN_REJECTED_MISSING_PASSWORD", {
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "Password obrigatória."
      });
    }

    // # Limite defensivo para evitar inputs absurdos
    if (password.length > 200) {
      logger.warn("LOGIN_REJECTED_INVALID_FORMAT", {
        ip: req.ip
      });

      return res.status(400).json({
        ok: false,
        message: "Formato de credenciais inválido."
      });
    }

    // # Validar configuração crítica
    if (!process.env.ADMIN_PASSWORD_HASH || !process.env.JWT_SECRET) {
      logger.error("LOGIN_CONFIG_ERROR", {
        ip: req.ip
      });

      return res.status(500).json({
        ok: false,
        message: "Erro interno de autenticação."
      });
    }

    // # Em produção, exigir secret minimamente forte
    if (isProduction && process.env.JWT_SECRET.length < 32) {
      logger.error("JWT_SECRET_TOO_WEAK", {
        ip: req.ip
      });

      return res.status(500).json({
        ok: false,
        message: "Erro interno de autenticação."
      });
    }

    // # Comparar password introduzida com hash guardado no .env
    const passwordCorreta = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!passwordCorreta) {
      logger.warn("LOGIN_FAILED", {
        ip: req.ip
      });

      return res.status(401).json({
        ok: false,
        message: "Credenciais inválidas."
      });
    }

    // # Criar token JWT
    const token = jwt.sign(
      {
        sub: "admin",
        role: "admin"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "12h",
        issuer: "mercedes-w115-api",
        audience: "mercedes-w115-admin"
      }
    );

    // # Guardar token em cookie seguro
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    logger.log("LOGIN_SUCCESS", {
      ip: req.ip,
      admin: "admin"
    });

    return res.json({
      ok: true,
      message: "Login efetuado com sucesso."
    });
  } catch (error) {
    logger.error("LOGIN_ERROR", {
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno no login."
    });
  }
};

// # Logout do admin
exports.logoutAdmin = (req, res) => {
  res.clearCookie(COOKIE_NAME, getClearCookieOptions());

  logger.log("LOGOUT_SUCCESS", {
    ip: req.ip,
    admin: req.admin?.sub || "admin"
  });

  return res.json({
    ok: true,
    message: "Logout efetuado com sucesso."
  });
};

// # Verificar sessão atual do admin
exports.getMe = (req, res) => {
  return res.json({
    ok: true,
    authenticated: true,
    admin: {
      role: req.admin.role
    }
  });
};