/**
 * Configuración central de autenticación.
 *
 * Evita que el servidor utilice una clave JWT
 * predeterminada o insegura.
 */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET no está configurado en el archivo .env."
  );
}

if (JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET debe contener al menos 32 caracteres."
  );
}

module.exports = Object.freeze({
  secret: JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  algorithm: "HS256",
  issuer: "istream-api",
  audience: "istream-web",
});