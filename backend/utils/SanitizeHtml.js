// # Limpar HTML dos artigos para evitar XSS
const sanitizeHtml = require("sanitize-html");

function sanitizePostHtml(html) {
  const clean = sanitizeHtml(html || "", {
    // # Tags permitidas
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u",
      "h1", "h2", "h3", "h4",
      "ul", "ol", "li",
      "blockquote",
      "a",
      "img",
      "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td"
    ],

    // # Atributos permitidos
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      figure: [],
      figcaption: [],
      p: [],
      h1: [], h2: [], h3: [], h4: [],
      ul: [], ol: [], li: [],
      blockquote: [],
      table: [], thead: [], tbody: [], tr: [], th: [], td: [],
      strong: [], b: [], em: [], i: [], u: [],
      br: []
    },

    // # Protocolos permitidos
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: {
      img: ["http", "https"]
    },

    disallowedTagsMode: "discard",

    // # Transformações seguras
    transformTags: {
      a: (tagName, attribs) => {
        return {
          tagName: "a",
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer"
          }
        };
      }
    }
  });

  // # Limite de segurança no tamanho final (ex: 50k caracteres)
  if (clean.length > 50000) {
    return clean.slice(0, 50000);
  }

  return clean;
}

module.exports = sanitizePostHtml;