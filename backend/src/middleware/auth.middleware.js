const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "istream-local-dev-secret";

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      mensaje: "Token de autenticación requerido.",
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      mensaje: "Token inválido o expirado.",
    });
  }
}

module.exports = verificarToken;
