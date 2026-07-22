const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const JWT_CONFIG = require(
  "../config/auth.config"
);

const CORREO_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTRASENA_SEGURA_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,72}$/;

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