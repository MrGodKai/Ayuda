const PORT = Number(process.env.PORT || 3001);
const BASE_URL =
  process.env.BACKEND_PUBLIC_URL || `http://localhost:${PORT}`;

/**
 * Convierte una ruta relativa (/uploads/...) en una URL
 * absoluta hacia este backend. Si ya es absoluta, la deja igual.
 */
function urlAbsoluta(ruta) {
  if (!ruta) {
    return null;
  }

  if (/^https?:\/\//i.test(ruta)) {
    return ruta;
  }

  return `${BASE_URL}${ruta}`;
}

module.exports = { urlAbsoluta };
