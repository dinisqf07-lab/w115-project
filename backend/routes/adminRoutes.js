const express = require("express");
const fs = require("fs");
const path = require("path");
const { requireAdmin } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

const router = express.Router();

// # Caminho para o ficheiro de logs
const logFilePath = path.join(__dirname, "..", "storage", "logs", "app.log");

// # GET /api/admin/logs
// # Devolve os últimos logs
router.get("/logs", requireAdmin, (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 200)
      : 100;

    if (!fs.existsSync(logFilePath)) {
      return res.json({
        ok: true,
        logs: []
      });
    }

    const data = fs.readFileSync(logFilePath, "utf-8");

    const lines = data
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .reverse();

    return res.json({
      ok: true,
      logs: lines
    });
  } catch (error) {
    logger.error("ADMIN_LOGS_READ_ERROR", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro ao carregar logs."
    });
  }
});

module.exports = router;