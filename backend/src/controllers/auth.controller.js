const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const JWT_CONFIG = require(
  "../config/auth.config"
);
const {
  enviarCorreo,
  correoHabilitado,
} = require("../services/mail.service");

const CORREO_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTRASENA_SEGURA_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,72}$/;

const TOKEN_RECUPERACION_REGEX =
  /^[a-f0-9]{64}$/i;

const MINUTOS_EXPIRACION_RESET = Math.min(
  Math.max(
    Number(
      process.env
        .PASSWORD_RESET_TOKEN_MINUTES || 20
    ),
    10
  ),
  60
);

const COOLDOWN_SOLICITUD_RESET_SEGUNDOS = Math.min(
  Math.max(
    Number(
      process.env
        .PASSWORD_RESET_COOLDOWN_SECONDS || 60
    ),
    30
  ),
  300
);

const MENSAJE_RECUPERACION_GENERICO =
  "Si existe una cuenta con ese correo, recibirá un enlace para restablecer la contraseña.";

/**
 * Convierte el correo a minúscula
 * y elimina espacios.
 */
function normalizarCorreo(correo) {
  return String(correo || "")
    .trim()
    .toLowerCase();
}

/**
 * Genera un token JWT de acceso.
 */
function crearTokenAcceso(usuario) {
  return jwt.sign(
    {
      tipo: "access",
      rol: usuario.rol,
    },
    JWT_CONFIG.secret,
    {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      subject: String(usuario.id_usuario),
    }
  );
}

function crearTokenRecuperacion() {
  const token =
    crypto
      .randomBytes(32)
      .toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return {
    token,
    tokenHash,
  };
}

function construirUrlRecuperacion(token) {
  const baseUrl = String(
    process.env
      .PASSWORD_RESET_URL_BASE ||
      `${
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
      }/`
  ).trim();

  const separador =
    baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separador}token=${encodeURIComponent(
    token
  )}`;
}

function crearFechaExpiracionReset() {
  const expiraEn = new Date();

  expiraEn.setMinutes(
    expiraEn.getMinutes() +
      MINUTOS_EXPIRACION_RESET
  );

  return expiraEn;
}

/**
 * Registra un usuario.
 */
exports.registrar = async (req, res) => {
  try {
    const nombre = String(
      req.body.nombre || ""
    ).trim();

    const correo = normalizarCorreo(
      req.body.correo
    );

    const contrasena =
      req.body.contrasena;

    if (
      !nombre ||
      !correo ||
      typeof contrasena !== "string"
    ) {
      return res.status(400).json({
        mensaje:
          "Nombre, correo y contraseña son obligatorios.",
      });
    }

    if (
      nombre.length < 2 ||
      nombre.length > 100
    ) {
      return res.status(400).json({
        mensaje:
          "El nombre debe contener entre 2 y 100 caracteres.",
      });
    }

    if (
      !CORREO_REGEX.test(correo) ||
      correo.length > 150
    ) {
      return res.status(400).json({
        mensaje:
          "El correo no tiene un formato válido.",
      });
    }

    if (
      !CONTRASENA_SEGURA_REGEX.test(
        contrasena
      )
    ) {
      return res.status(400).json({
        mensaje:
          "La contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y símbolo.",
      });
    }

    const [usuariosExistentes] =
      await pool.execute(
        `SELECT id_usuario
         FROM usuarios
         WHERE correo = ?
         LIMIT 1`,
        [correo]
      );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        mensaje:
          "Ya existe un usuario con ese correo.",
      });
    }

    const contrasenaHash =
      await bcrypt.hash(contrasena, 12);

    /*
     * El registro público siempre asigna
     * el rol usuario.
     *
     * No se acepta un rol enviado por
     * el frontend.
     */
console.log("=== REGISTRO ===");
console.log("DB HOST:", process.env.DB_HOST);
console.log("DB NAME:", process.env.DB_NAME);
console.log("Correo:", correo);

    const [resultado] =
      await pool.execute(
        `INSERT INTO usuarios
         (
           nombre,
           correo,
           contrasena_hash,
           rol,
           estado
         )
         VALUES (?, ?, ?, 'usuario', TRUE)`,
        [
          nombre,
          correo,
          contrasenaHash,
        ]
      );

    return res.status(201).json({
      mensaje:
        "Usuario registrado correctamente.",
      usuario: {
        id: resultado.insertId,
        nombre,
        correo,
        rol: "usuario",
      },
    });
  } catch (error) {
    console.error(
      "Error al registrar:",
      error
    );

    return res.status(500).json({
      mensaje:
        "Ocurrió un error al registrar el usuario.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * Inicia sesión consultando MySQL.
 */
exports.iniciarSesion = async (
  req,
  res
) => {
  try {
    const correo = normalizarCorreo(
      req.body.correo
    );

    const contrasena =
      req.body.contrasena;

    if (
      !correo ||
      typeof contrasena !== "string" ||
      !contrasena
    ) {
      return res.status(400).json({
        mensaje:
          "Correo y contraseña son obligatorios.",
      });
    }

    if (
      !CORREO_REGEX.test(correo) ||
      correo.length > 150
    ) {
      return res.status(400).json({
        mensaje:
          "El correo no tiene un formato válido.",
      });
    }

    /*
     * Evita entradas excesivamente grandes.
     */
    if (contrasena.length > 200) {
      return res.status(400).json({
        mensaje:
          "Las credenciales no son válidas.",
      });
    }

    const [resultados] =
      await pool.execute(
        `SELECT
           id_usuario,
           nombre,
           correo,
           contrasena_hash,
           rol,
           estado,
           foto_perfil,
           telefono,
           ciudad
         FROM usuarios
         WHERE correo = ?
         LIMIT 1`,
        [correo]
      );

    /*
     * No se indica si lo incorrecto
     * fue el correo o la contraseña.
     */
    if (resultados.length === 0) {
      return res.status(401).json({
        mensaje:
          "Correo o contraseña incorrectos.",
      });
    }

    const usuario = resultados[0];

    const contrasenaCorrecta =
      await bcrypt.compare(
        contrasena,
        usuario.contrasena_hash
      );

    if (!contrasenaCorrecta) {
      return res.status(401).json({
        mensaje:
          "Correo o contraseña incorrectos.",
      });
    }

    if (!usuario.estado) {
      return res.status(403).json({
        mensaje:
          "La cuenta se encuentra desactivada.",
      });
    }

    const token =
      crearTokenAcceso(usuario);

    return res.status(200).json({
      mensaje:
        "Inicio de sesión correcto.",
      token,
      expiraEn: JWT_CONFIG.expiresIn,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        fotoPerfil:
          usuario.foto_perfil,
        telefono: usuario.telefono,
        ciudad: usuario.ciudad,
      },
    });
  } catch (error) {
    console.error(
      "Error al iniciar sesión:",
      error
    );

    return res.status(500).json({
      mensaje:
        "Ocurrió un error al iniciar sesión.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * Solicita recuperación de contraseña
 * y envía un enlace al correo del usuario.
 */
exports.solicitarRecuperacionContrasena = async (
  req,
  res
) => {
  try {
    const correo = normalizarCorreo(
      req.body.correo
    );

    if (!correo) {
      return res.status(400).json({
        mensaje:
          "El correo es obligatorio.",
      });
    }

    if (
      !CORREO_REGEX.test(correo) ||
      correo.length > 150
    ) {
      return res.status(400).json({
        mensaje:
          "El correo no tiene un formato válido.",
      });
    }

    if (!correoHabilitado()) {
      return res.status(503).json({
        mensaje:
          "El servicio de recuperación no está disponible en este momento.",
      });
    }

    const [usuarios] = await pool.execute(
      `SELECT
         id_usuario,
         nombre,
         correo,
         estado
       FROM usuarios
       WHERE correo = ?
       LIMIT 1`,
      [correo]
    );

    if (usuarios.length === 0) {
      return res.status(200).json({
        mensaje:
          MENSAJE_RECUPERACION_GENERICO,
      });
    }

    const usuario = usuarios[0];

    if (!usuario.estado) {
      return res.status(200).json({
        mensaje:
          MENSAJE_RECUPERACION_GENERICO,
      });
    }

    const [solicitudesRecientes] = await pool.execute(
      `SELECT id_reset
       FROM password_resets
       WHERE id_usuario = ?
         AND usado_en IS NULL
         AND creado_en >= DATE_SUB(NOW(), INTERVAL ${COOLDOWN_SOLICITUD_RESET_SEGUNDOS} SECOND)
       LIMIT 1`,
      [usuario.id_usuario]
    );

    if (solicitudesRecientes.length > 0) {
      return res.status(200).json({
        mensaje:
          MENSAJE_RECUPERACION_GENERICO,
      });
    }

    const {
      token,
      tokenHash,
    } = crearTokenRecuperacion();

    const expiraEn =
      crearFechaExpiracionReset();

    const ipSolicitud = String(
      req.ip || ""
    ).slice(0, 45);

    const agenteUsuario = String(
      req.get("user-agent") || ""
    ).slice(0, 255);

    const [resultado] = await pool.execute(
      `INSERT INTO password_resets
       (
         id_usuario,
         token_hash,
         expira_en,
         solicitado_ip,
         solicitado_user_agent
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        usuario.id_usuario,
        tokenHash,
        expiraEn,
        ipSolicitud || null,
        agenteUsuario || null,
      ]
    );

    const urlRecuperacion =
      construirUrlRecuperacion(token);

    const saludo = usuario.nombre
      ? `Hola ${usuario.nombre},`
      : "Hola,";

    try {
      await enviarCorreo({
        to: usuario.correo,
        subject:
          "Restablecer contraseña de iStream",
        text: `${saludo}\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nUsa este enlace (válido por ${MINUTOS_EXPIRACION_RESET} minutos):\n${urlRecuperacion}\n\nSi no solicitaste este cambio, ignora este mensaje.`,
        html: `<p>${saludo}</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${urlRecuperacion}">Restablecer contraseña</a></p><p>Este enlace vencerá en ${MINUTOS_EXPIRACION_RESET} minutos.</p><p>Si no solicitaste este cambio, puedes ignorar este correo.</p>`,
      });
    } catch (errorCorreo) {
      await pool.execute(
        `DELETE FROM password_resets
         WHERE id_reset = ?`,
        [resultado.insertId]
      );

      console.error(
        "Error al enviar correo de recuperación:",
        errorCorreo
      );

      return res.status(500).json({
        mensaje:
          "No se pudo enviar el correo de recuperación. Intente nuevamente más tarde.",
      });
    }

    return res.status(200).json({
      mensaje:
        MENSAJE_RECUPERACION_GENERICO,
    });
  } catch (error) {
    console.error(
      "Error al solicitar recuperación:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo procesar la solicitud de recuperación.",
    });
  }
};

/**
 * Restablece la contraseña usando
 * un token de recuperación de un solo uso.
 */
exports.restablecerContrasena = async (
  req,
  res
) => {
  let conexion;
  let transaccionIniciada = false;

  try {
    const token = String(
      req.body.token || ""
    ).trim();

    const contrasenaNueva =
      req.body.contrasenaNueva;

    if (
      !token ||
      typeof contrasenaNueva !== "string"
    ) {
      return res.status(400).json({
        mensaje:
          "Token y nueva contraseña son obligatorios.",
      });
    }

    if (!TOKEN_RECUPERACION_REGEX.test(token)) {
      return res.status(400).json({
        mensaje:
          "El enlace de recuperación no es válido.",
      });
    }

    if (
      !CONTRASENA_SEGURA_REGEX.test(
        contrasenaNueva
      )
    ) {
      return res.status(400).json({
        mensaje:
          "La contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y símbolo.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    conexion = await pool.getConnection();
    await conexion.beginTransaction();
    transaccionIniciada = true;

    const [tokens] = await conexion.execute(
      `SELECT
         pr.id_reset,
         pr.id_usuario,
         pr.expira_en,
         pr.usado_en,
         u.nombre,
         u.correo,
         u.contrasena_hash
       FROM password_resets pr
       INNER JOIN usuarios u
         ON u.id_usuario = pr.id_usuario
       WHERE pr.token_hash = ?
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      await conexion.rollback();
      transaccionIniciada = false;

      return res.status(400).json({
        mensaje:
          "El enlace de recuperación no es válido o ya expiró.",
      });
    }

    const tokenGuardado = tokens[0];
    const ahora = new Date();

    if (
      tokenGuardado.usado_en ||
      new Date(tokenGuardado.expira_en) <
        ahora
    ) {
      await conexion.rollback();
      transaccionIniciada = false;

      return res.status(400).json({
        mensaje:
          "El enlace de recuperación no es válido o ya expiró.",
      });
    }

    const esMismaContrasena =
      await bcrypt.compare(
        contrasenaNueva,
        tokenGuardado.contrasena_hash
      );

    if (esMismaContrasena) {
      await conexion.rollback();
      transaccionIniciada = false;

      return res.status(400).json({
        mensaje:
          "La nueva contraseña debe ser diferente a la contraseña actual.",
      });
    }

    const hashNuevo = await bcrypt.hash(
      contrasenaNueva,
      12
    );

    await conexion.execute(
      `UPDATE usuarios
       SET contrasena_hash = ?
       WHERE id_usuario = ?`,
      [hashNuevo, tokenGuardado.id_usuario]
    );

    await conexion.execute(
      `UPDATE password_resets
       SET usado_en = NOW()
       WHERE id_usuario = ?
         AND usado_en IS NULL`,
      [tokenGuardado.id_usuario]
    );

    await conexion.commit();
    transaccionIniciada = false;

    if (correoHabilitado()) {
      try {
        await enviarCorreo({
          to: tokenGuardado.correo,
          subject:
            "Tu contraseña de iStream fue actualizada",
          text: `Hola ${
            tokenGuardado.nombre || ""
          },\n\nTu contraseña se cambió correctamente. Si no realizaste este cambio, contacta soporte de inmediato.`,
          html: `<p>Hola ${
            tokenGuardado.nombre || ""
          },</p><p>Tu contraseña se cambió correctamente.</p><p>Si no realizaste este cambio, contacta soporte de inmediato.</p>`,
        });
      } catch (errorCorreo) {
        console.error(
          "No se pudo enviar correo de notificación de cambio de contraseña:",
          errorCorreo
        );
      }
    }

    return res.status(200).json({
      mensaje:
        "La contraseña se restableció correctamente.",
    });
  } catch (error) {
    if (conexion && transaccionIniciada) {
      await conexion.rollback();
    }

    console.error(
      "Error al restablecer contraseña:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo restablecer la contraseña.",
    });
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

/**
 * Cambia contraseña para usuario autenticado.
 */
exports.cambiarContrasena = async (
  req,
  res
) => {
  try {
    const idUsuario = req.usuario?.id;
    const contrasenaActual =
      req.body.contrasenaActual;
    const contrasenaNueva =
      req.body.contrasenaNueva;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje:
          "No se pudo identificar al usuario.",
      });
    }

    if (
      typeof contrasenaActual !==
        "string" ||
      typeof contrasenaNueva !==
        "string" ||
      !contrasenaActual ||
      !contrasenaNueva
    ) {
      return res.status(400).json({
        mensaje:
          "La contraseña actual y la nueva contraseña son obligatorias.",
      });
    }

    if (
      !CONTRASENA_SEGURA_REGEX.test(
        contrasenaNueva
      )
    ) {
      return res.status(400).json({
        mensaje:
          "La nueva contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y símbolo.",
      });
    }

    const [usuarios] = await pool.execute(
      `SELECT
         id_usuario,
         nombre,
         correo,
         contrasena_hash
       FROM usuarios
       WHERE id_usuario = ?
       LIMIT 1`,
      [idUsuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensaje:
          "Usuario no encontrado.",
      });
    }

    const usuario = usuarios[0];

    const contrasenaActualCorrecta =
      await bcrypt.compare(
        contrasenaActual,
        usuario.contrasena_hash
      );

    if (!contrasenaActualCorrecta) {
      return res.status(401).json({
        mensaje:
          "La contraseña actual no es correcta.",
      });
    }

    const esMismaContrasena =
      await bcrypt.compare(
        contrasenaNueva,
        usuario.contrasena_hash
      );

    if (esMismaContrasena) {
      return res.status(400).json({
        mensaje:
          "La nueva contraseña debe ser diferente a la contraseña actual.",
      });
    }

    const hashNuevo = await bcrypt.hash(
      contrasenaNueva,
      12
    );

    await pool.execute(
      `UPDATE usuarios
       SET contrasena_hash = ?
       WHERE id_usuario = ?`,
      [hashNuevo, idUsuario]
    );

    await pool.execute(
      `UPDATE password_resets
       SET usado_en = NOW()
       WHERE id_usuario = ?
         AND usado_en IS NULL`,
      [idUsuario]
    );

    if (correoHabilitado()) {
      try {
        await enviarCorreo({
          to: usuario.correo,
          subject:
            "Tu contraseña de iStream fue cambiada",
          text: `Hola ${
            usuario.nombre || ""
          },\n\nTu contraseña fue cambiada desde tu sesión activa. Si no reconoces esta acción, cambia tu contraseña inmediatamente.`,
          html: `<p>Hola ${
            usuario.nombre || ""
          },</p><p>Tu contraseña fue cambiada desde tu sesión activa.</p><p>Si no reconoces esta acción, cambia tu contraseña inmediatamente.</p>`,
        });
      } catch (errorCorreo) {
        console.error(
          "No se pudo enviar correo de notificación de cambio de contraseña:",
          errorCorreo
        );
      }
    }

    return res.status(200).json({
      mensaje:
        "Contraseña actualizada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error al cambiar contraseña:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo actualizar la contraseña.",
    });
  }
};