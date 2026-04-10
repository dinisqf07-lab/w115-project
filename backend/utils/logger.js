const fs = require("fs");
const path = require("path");

// # Pasta onde os logs vão ficar guardados
const logsDir = path.join(__dirname, "..", "storage", "logs");

// # Ficheiro principal de logs
const logFilePath = path.join(logsDir, "app.log");

// # Criar pasta de logs se não existir
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// # Data/hora atual em formato ISO
function now() {
  return new Date().toISOString();
}

// # Escrever linha no ficheiro
function writeToFile(line) {
  fs.appendFile(logFilePath, line + "\n", (err) => {
    if (err) {
      console.error(`[${now()}] [ERROR] LOGGER_WRITE_FAILED`, {
        message: err.message
      });
    }
  });
}

// # Formatar linha de log
function formatLine(level, event, data = {}) {
  return `[${now()}] [${level}] ${event} ${JSON.stringify(data)}`;
}

// # Log normal
function log(event, data = {}) {
  const line = formatLine("INFO", event, data);
  console.log(line);
  writeToFile(line);
}

// # Log de aviso
function warn(event, data = {}) {
  const line = formatLine("WARN", event, data);
  console.warn(line);
  writeToFile(line);
}

// # Log de erro
function error(event, data = {}) {
  const line = formatLine("ERROR", event, data);
  console.error(line);
  writeToFile(line);
}

module.exports = {
  log,
  warn,
  error,
  logFilePath
};