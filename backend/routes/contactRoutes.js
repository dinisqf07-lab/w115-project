const express = require("express");
const logger = require("../utils/logger");
const db = require("../db/database");

const router = express.Router();

// # Tipos de contacto permitidos
const TIPOS_PERMITIDOS = [
  "sugestao",
  "pergunta",
  "partilha de restauro",
  "outro"
];

// # Remove quebras de linha e espaços estranhos de campos curtos
function cleanSingleLine(text) {
  return String(text || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// # Validação simples de email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// # Validar dados do formulário
function validateContactData({ name, email, phone, type, message, website }) {
  if (website && website.trim() !== "") {
    return "Pedido inválido.";
  }

  if (!name || !email || !message) {
    return "Nome, email e mensagem são obrigatórios.";
  }

  if (name.length < 2 || name.length > 100) {
    return "O nome deve ter entre 2 e 100 caracteres.";
  }

  if (email.length > 150) {
    return "O email é demasiado grande.";
  }

  if (!isValidEmail(email)) {
    return "O email introduzido não é válido.";
  }

  if (phone && phone.length > 30) {
    return "O telefone é demasiado grande.";
  }

  if (type && !TIPOS_PERMITIDOS.includes(type)) {
    return "O tipo de contacto é inválido.";
  }

  if (message.length < 2 || message.length > 5000) {
    return "A mensagem deve ter entre 2 e 5000 caracteres.";
  }

  return null;
}

// # POST /api/contact
// # Guarda a mensagem na base de dados
router.post("/", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    const name = cleanSingleLine(body.name);
    const email = cleanSingleLine(body.email).toLowerCase();
    const phone = cleanSingleLine(body.phone || "");
    const type = cleanSingleLine(body.type || "").toLowerCase();
    const message = String(body.message || "").trim();
    const website = String(body.website || "").trim(); // # honeypot

    const erroValidacao = validateContactData({
      name,
      email,
      phone,
      type,
      message,
      website
    });

    if (erroValidacao) {
      logger.warn("CONTACT_VALIDATION_FAILED", {
        ip: req.ip,
        email: email || null,
        type: type || null,
        reason: erroValidacao
      });

      return res.status(400).json({
        ok: false,
        message: erroValidacao
      });
    }

    const insert = db.prepare(`
      INSERT INTO contacts (name, email, phone, type, message)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name,
      email,
      phone || null,
      type || null,
      message
    );

    logger.log("CONTACT_SAVED", {
      id: result.lastInsertRowid,
      ip: req.ip,
      email,
      type: type || "nao-indicado"
    });

    return res.json({
      ok: true,
      message: "Mensagem enviada com sucesso."
    });
  } catch (error) {
    logger.error("CONTACT_SAVE_ERROR", {
      ip: req.ip,
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Não foi possível enviar a mensagem."
    });
  }
});

module.exports = router;