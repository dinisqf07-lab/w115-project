const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const uploadController = require("../controllers/uploadController");
const { requireAdmin } = require("../middleware/authMiddleware");

// # Upload protegido (admin + validação de ficheiro)
router.post(
  "/",
  requireAdmin,
  upload.single("image"),
  (req, res, next) => {
    // # Garantir que veio ficheiro
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "Nenhum ficheiro enviado."
      });
    }

    next();
  },
  uploadController.uploadImage
);

module.exports = router;