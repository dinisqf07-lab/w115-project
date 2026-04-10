// # Importações
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");
require("dotenv").config();

// # Importar rotas
const postsRoutes = require("./routes/postsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/authRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");

// # Criar app
const app = express();

// # Proxy
app.set("trust proxy", 1);

// # Segurança base
app.disable("x-powered-by");

// # Ambiente
const isProduction = process.env.NODE_ENV === "production";

// # URLs do ambiente
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL || "https://w115-project.onrender.com";

// # Validar variáveis importantes em produção
if (isProduction) {
  const requiredEnvVars = [
    "FRONTEND_URL",
    "BACKEND_URL"
  ];

  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    logger.error("MISSING_ENV_VARS", {
      missing: missingEnvVars
    });

    process.exit(1);
  }
}

// # Origins permitidos
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  FRONTEND_URL
].filter(Boolean);

// # Helmet + CSP
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "http://127.0.0.1:5000",
          "http://localhost:5000",
          BACKEND_URL
        ].filter(Boolean),
        connectSrc: [
          "'self'",
          "http://127.0.0.1:5000",
          "http://localhost:5000",
          BACKEND_URL,
          FRONTEND_URL
        ].filter(Boolean),
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"]
      }
    },
    referrerPolicy: { policy: "no-referrer" }
  })
);

// # Cookies
app.use(cookieParser());

// # CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // # Permite requests sem origin (Postman, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn("CORS_BLOCKED", {
        origin,
        allowedOrigins
      });

      return callback(new Error("Origem não permitida pelo CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// # Rate limit global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Demasiados pedidos. Tenta novamente daqui a pouco."
  }
});

// # Rate limit para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    ok: false,
    message: "Demasiadas tentativas de autenticação. Tenta novamente daqui a pouco."
  }
});

// # Rate limit para contacto
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Enviaste pedidos a mais. Aguarda antes de tentar outra vez."
  }
});

// # Rate limit para uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Demasiados uploads num curto espaço de tempo."
  }
});

// # Rate limit para área de administração
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: "Demasiados pedidos na área de administração."
  }
});

app.use(globalLimiter);

// # Parsers do body
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// # Uploads estáticos
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    index: false,
    extensions: false,
    fallthrough: false,
    setHeaders: (res) => {
      // # Evita sniffing de conteúdo
      res.setHeader("X-Content-Type-Options", "nosniff");

      // # Cache para ficheiros estáticos
      res.setHeader("Cache-Control", "public, max-age=86400");

      // # Força comportamento mais previsível no browser
      res.setHeader("Content-Disposition", "inline");
    }
  })
);

// # Rota base
app.get("/", (req, res) => {
  return res.json({
    ok: true,
    message: "Backend a funcionar"
  });
});

// # Rotas da API
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/contact", contactLimiter, contactRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);

// # 404
app.use((req, res) => {
  logger.warn("ROUTE_NOT_FOUND", {
    method: req.method,
    route: req.originalUrl,
    ip: req.ip
  });

  return res.status(404).json({
    ok: false,
    message: "Rota não encontrada."
  });
});

// # Erros globais
app.use((err, req, res, next) => {
  logger.error("GLOBAL_ERROR", {
    message: err.message,
    code: err.code || null,
    method: req.method,
    route: req.originalUrl,
    ip: req.ip
  });

  // # Erro de CORS
  if (err.message === "Origem não permitida pelo CORS.") {
    return res.status(403).json({
      ok: false,
      message: "Origem não permitida."
    });
  }

  // # JSON inválido
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      ok: false,
      message: "JSON inválido."
    });
  }

  // # Payload demasiado grande
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      ok: false,
      message: "Pedido demasiado grande."
    });
  }

  // # Erros personalizados de formato
  if (err.message && err.message.includes("Formato inválido")) {
    return res.status(400).json({
      ok: false,
      message: err.message
    });
  }

  // # Ficheiro demasiado grande
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      ok: false,
      message: "O ficheiro é demasiado grande (máx: 5MB)."
    });
  }

  return res.status(500).json({
    ok: false,
    message: "Erro interno no servidor."
  });
});

// # Tratamento de erros fatais fora do Express
process.on("unhandledRejection", (reason) => {
  logger.error("UNHANDLED_REJECTION", {
    reason: reason instanceof Error ? reason.message : String(reason)
  });
});

process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT_EXCEPTION", {
    message: error.message,
    stack: error.stack
  });

  process.exit(1);
});

// # Porta
const PORT = process.env.PORT || 5000;

// # Start
app.listen(PORT, () => {
  logger.log("SERVER_STARTED", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    isProduction,
    FRONTEND_URL,
    BACKEND_URL,
    allowedOrigins
  });
});