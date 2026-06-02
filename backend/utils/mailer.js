// # utils/mailer.js
const nodemailer = require("nodemailer");
const logger = require("./logger");

// # Transporter do Gmail com App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// # Verificar ligação ao arrancar (opcional mas útil)
transporter.verify((err) => {
  if (err) {
    logger.error("MAILER_VERIFY_FAILED", { message: err.message });
  } else {
    logger.log("MAILER_READY", { user: process.env.GMAIL_USER });
  }
});

module.exports = transporter;