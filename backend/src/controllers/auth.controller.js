const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const JWT_SECRET =
  process.env.JWT_SECRET || "istream-local-dev-secret";

/**
 * Registra un usuario en MySQL.
 */
exports.registrar = async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;

    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({
        mensaje:
          "Nombre, correo y contraseña son obligatorios.",
      });
    }

    if (contrasena.length < 8) {
      return res.status(400).json({
        mensaje:
          "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    const nombreNormalizado = nombre.trim();
    const correoNormalizado = correo.trim().toLowerCase();

    // Buscar si el correo ya existe en MySQL.
    const [usuariosExistentes] = await pool.execute(
      `SELECT id_usuario
       FROM usuarios
       WHERE correo = ?
       LIMIT 1`,
      [correoNormalizado]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con ese correo.",
      });
    }

    // Proteger la contraseña.
    const contrasenaHash = await bcrypt.hash(
      contrasena,
      12
    );

    // Insertar el usuario en MySQL.
    const [resultado] = await pool.execute(
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
        nombreNormalizado,
        correoNormalizado,
        contrasenaHash,
      ]
    );

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: {
        id: resultado.insertId,
        nombre: nombreNormalizado,
        correo: correoNormalizado,
        rol: "usuario",
      },
    });
  } catch (error) {
    console.error("Error al registrar:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error al registrar el usuario.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * Inicia sesión consultando MySQL.
 */
exports.iniciarSesion = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        mensaje:
          "Correo y contraseña son obligatorios.",
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    // Buscar el usuario real en MySQL.
    const [resultados] = await pool.execute(
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
      [correoNormalizado]
    );

    if (resultados.length === 0) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos.",
      });
    }

    const usuario = resultados[0];

    if (!usuario.estado) {
      return res.status(403).json({
        mensaje: "La cuenta se encuentra desactivada.",
      });
    }

    const contrasenaCorrecta = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    );

    if (!contrasenaCorrecta) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos.",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id_usuario,
        rol: usuario.rol,
      },
      JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    return res.status(200).json({
      mensaje: "Inicio de sesión correcto.",
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        fotoPerfil: usuario.foto_perfil,
        telefono: usuario.telefono,
        ciudad: usuario.ciudad,
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error al iniciar sesión.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};