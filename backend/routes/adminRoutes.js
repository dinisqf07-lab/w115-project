const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db/database");
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

// # GET /api/admin/messages
// # Lista mensagens recebidas pelo formulário de contacto
router.get("/messages", requireAdmin, (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT id, name, email, phone, type, message, is_read, created_at
      FROM contacts
      ORDER BY datetime(created_at) DESC, id DESC
    `).all();

    return res.json({
      ok: true,
      messages
    });
  } catch (error) {
    logger.error("ADMIN_MESSAGES_READ_ERROR", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro ao carregar mensagens."
    });
  }
});

// # PATCH /api/admin/messages/:id/read
// # Marca uma mensagem como lida
router.patch("/messages/:id/read", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        message: "ID de mensagem inválido."
      });
    }

    const result = db.prepare(`
      UPDATE contacts
      SET is_read = 1
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        ok: false,
        message: "Mensagem não encontrada."
      });
    }

    logger.log("ADMIN_MESSAGE_MARKED_READ", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      messageId: id
    });

    return res.json({
      ok: true,
      message: "Mensagem marcada como lida."
    });
  } catch (error) {
    logger.error("ADMIN_MESSAGE_MARK_READ_ERROR", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message,
      messageId: req.params.id
    });

    return res.status(500).json({
      ok: false,
      message: "Erro ao marcar mensagem como lida."
    });
  }
});

// # DELETE /api/admin/messages/:id
// # Apaga uma mensagem
router.delete("/messages/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        message: "ID de mensagem inválido."
      });
    }

    const result = db.prepare(`
      DELETE FROM contacts
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        ok: false,
        message: "Mensagem não encontrada."
      });
    }

    logger.log("ADMIN_MESSAGE_DELETED", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      messageId: id
    });

    return res.json({
      ok: true,
      message: "Mensagem apagada com sucesso."
    });
  } catch (error) {
    logger.error("ADMIN_MESSAGE_DELETE_ERROR", {
      admin: req.admin?.sub || "admin",
      ip: req.ip,
      message: error.message,
      messageId: req.params.id
    });

    return res.status(500).json({
      ok: false,
      message: "Erro ao apagar mensagem."
    });
  }
});

module.exports = router;