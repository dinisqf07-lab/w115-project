const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "..", "uploads");

// # Criar pasta de uploads se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// # Tipos e extensões permitidos
const MIME_TYPES_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const EXTENSOES_PERMITIDAS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
];

// # Configuração do armazenamento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const extensao = path.extname(file.originalname).toLowerCase();

    let nomeBase = path
      .basename(file.originalname, extensao)
      .toLowerCase()
      .normalize("NFD") // # remove acentos
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "")
      .replace(/-+/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "")
      .slice(0, 60);

    // # Fallback caso o nome fique vazio após limpeza
    if (!nomeBase) {
      nomeBase = "imagem";
    }

    // # Evita colisões com bloco aleatório
    const randomPart = crypto.randomBytes(8).toString("hex");
    const uniqueName = `${Date.now()}-${randomPart}-${nomeBase}${extensao}`;

    cb(null, uniqueName);
  }
});

// # Filtrar ficheiros permitidos
function fileFilter(req, file, cb) {
  const extensao = path.extname(file.originalname).toLowerCase();

  // # Validar MIME type declarado
  if (!MIME_TYPES_PERMITIDOS.includes(file.mimetype)) {
    return cb(
      new Error("Formato inválido. Só são permitidas imagens JPG, PNG ou WEBP.")
    );
  }

  // # Validar extensão do nome do ficheiro
  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return cb(
      new Error("Extensão inválida. Só são permitidas imagens JPG, PNG ou WEBP.")
    );
  }

  cb(null, true);
}

// # Criar middleware do multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // # 5 MB
    files: 1,
    fields: 10,
    parts: 20,
    fieldSize: 1024 * 1024 // # 1 MB por campo de texto
  }
});

module.exports = upload;