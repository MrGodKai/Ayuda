const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const JWT_CONFIG = require("../config/auth.config");

/**
 * Verifica el JWT y consulta el usuario actual
 * en MySQL.
 */
async function verificarToken(req, res, next) {
  const authHeader =
    req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      mensaje:
        "Token de autenticación requerido.",
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      mensaje:
        "Token de autenticación requerido.",
    });
  }

  let payload;

  // Primera validación: firma, expiración,
  // emisor, audiencia y algoritmo.
  try {
    payload = jwt.verify(
      token,
      JWT_CONFIG.secret,
      {
        algorithms: [JWT_CONFIG.algorithm],
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      }
    );
  } catch (error) {
    const mensaje =
      error.name === "TokenExpiredError"
        ? "La sesión expiró. Inicie sesión nuevamente."
        : "Token inválido.";

    return res.status(401).json({
      mensaje,
    });
  }

  // Evita utilizar otro tipo de JWT.
  if (payload.tipo !== "access") {
    return res.status(401).json({
      mensaje:
        "El token no es válido para acceder a la aplicación.",
    });
  }

  const idUsuario = Number(payload.sub);

  if (
    !Number.isInteger(idUsuario) ||
    idUsuario <= 0
  ) {
    return res.status(401).json({
      mensaje:
        "El token no contiene un usuario válido.",
    });
  }

  try {
    /*
     * Se consulta nuevamente MySQL.
     *
     * No se confía únicamente en el rol que estaba
     * guardado cuando se creó el token.
     */
    const [resultados] = await pool.execute(
      `SELECT
         id_usuario,
         nombre,
         correo,
         rol,
         estado,
         ultima_actividad
       FROM usuarios
       WHERE id_usuario = ?
       LIMIT 1`,
      [idUsuario]
    );

    if (resultados.length === 0) {
      return res.status(401).json({
        mensaje:
          "El usuario de la sesión ya no existe.",
      });
    }

    const usuario = resultados[0];

    if (!usuario.estado) {
      return res.status(403).json({
        mensaje:
          "La cuenta se encuentra desactivada.",
      });
    }

    /*
     * Este será el usuario utilizado por los
     * demás controladores y middlewares.
     */
    req.usuario = {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };

    /*
     * Actualiza la marca de actividad para el indicador
     * de presencia (en línea / desconectado), pero con
     * throttle: solo si la última marca tiene más de 60s,
     * para no escribir en MySQL en cada request.
     */
    const ultimaMarca = usuario.ultima_actividad
      ? new Date(usuario.ultima_actividad).getTime()
      : 0;

    if (Date.now() - ultimaMarca > 60 * 1000) {
      try {
        await pool.execute(
          `UPDATE usuarios
           SET ultima_actividad = CURRENT_TIMESTAMP
           WHERE id_usuario = ?`,
          [usuario.id_usuario]
        );
      } catch (errorActividad) {
        console.warn(
          "No se pudo actualizar ultima_actividad:",
          errorActividad.message
        );
      }
    }

    return next();
  } catch (error) {
    console.error(
      "Error al validar la sesión en MySQL:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo validar la sesión.",
    });
  }
}

module.exports = verificarToken;