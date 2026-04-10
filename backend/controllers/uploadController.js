const logger = require("../utils/logger");

exports.uploadImage = (req, res) => {
  try {
    // # Garantir que veio um ficheiro
    if (!req.file) {
      logger.warn("UPLOAD_REJECTED_NO_FILE", {
        ip: req.ip,
        admin: req.admin?.sub || "admin"
      });

      return res.status(400).json({
        ok: false,
        message: "Nenhum ficheiro enviado."
      });
    }

    // # Base URL pública do backend
    const rawBaseUrl =
      process.env.BACKEND_URL ||
      `${req.protocol}://${req.get("host")}`;

    const baseUrl = rawBaseUrl.replace(/\/+$/, "");
    const relativePath = `/uploads/${req.file.filename}`;
    const imageUrl = `${baseUrl}${relativePath}`;

    logger.log("UPLOAD_SUCCESS", {
      ip: req.ip,
      admin: req.admin?.sub || "admin",
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    return res.status(201).json({
      ok: true,
      message: "Upload realizado com sucesso.",
      location: imageUrl,
      path: relativePath,
      filename: req.file.filename
    });
  } catch (error) {
    logger.error("UPLOAD_ERROR", {
      ip: req.ip,
      admin: req.admin?.sub || "admin",
      message: error.message
    });

    return res.status(500).json({
      ok: false,
      message: "Erro interno ao fazer upload."
    });
  }
};