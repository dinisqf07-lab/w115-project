// # routes/contactRoutes.js
const express = require("express");
const router = express.Router();
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
const logger = require("../utils/logger");

// # Sanitização básica para evitar HTML injection no email
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// # Validação simples de email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/", async (req, res) => {
  try {
    const { nome, email, telefone, tipo_contacto, mensagem, botcheck } = req.body;

    // # Honeypot anti-spam (se vier preenchido, ignora silenciosamente)
    if (botcheck) {
      return res.json({ ok: true });
    }

    // # Validação dos campos obrigatórios
    if (!nome || !email || !mensagem) {
      return res.status(400).json({
        ok: false,
        message: "Preenche os campos obrigatórios (nome, email e mensagem)."
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        ok: false,
        message: "Email inválido."
      });
    }

    if (nome.length > 100 || mensagem.length > 5000) {
      return res.status(400).json({
        ok: false,
        message: "Campos demasiado longos."
      });
    }

    // # Envio do email
  await resend.emails.send({
  from: "Site Contactos <onboarding@resend.dev>",
  to: process.env.EMAIL_DESTINO,
  replyTo: email,
  subject: `Nova mensagem de ${nome} — ${tipo_contacto || "sem tipo"}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Nova mensagem do site</h2>
      <p><strong>Nome:</strong> ${escapeHtml(nome)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(telefone) || "—"}</p>
      <p><strong>Tipo de contacto:</strong> ${escapeHtml(tipo_contacto) || "—"}</p>
      <hr>
      <p><strong>Mensagem:</strong></p>
      <p>${escapeHtml(mensagem).replace(/\n/g, "<br>")}</p>
    </div>
  `
});

    logger.log("CONTACT_EMAIL_SENT", { from: email, nome });

    return res.json({
      ok: true,
      message: "Mensagem enviada com sucesso."
    });
  } catch (err) {
    logger.error("CONTACT_EMAIL_FAILED", {
      message: err.message
    });

    return res.status(500).json({
      ok: false,
      message: "Não foi possível enviar a mensagem. Tenta novamente mais tarde."
    });
  }
});

module.exports = router;