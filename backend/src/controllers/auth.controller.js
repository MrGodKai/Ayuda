const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/**
 * Registro temporal.
 * Lo utilizaremos solamente para crear un usuario de prueba.
 * Hoy no construiremos todavía la pantalla de registro.
 */
exports.registrar = async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;

    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({
        mensaje: "Nombre, correo y contraseña son obligatorios.",
      });
    }

    if (contrasena.length < 8) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const [usuariosExistentes] = await pool.execute(
      "SELECT id_usuario FROM usuarios WHERE correo = ?",
      [correoNormalizado]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con ese correo.",
      });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 12);

    const [resultado] = await pool.execute(
      `INSERT INTO usuarios
       (nombre, correo, contrasena_hash)
       VALUES (?, ?, ?)`,
      [nombre.trim(), correoNormalizado, contrasenaHash]
    );

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: {
        id: resultado.insertId,
        nombre: nombre.trim(),
        correo: correoNormalizado,
      },
    });
  } catch (error) {
    console.error("Error al registrar:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error al registrar el usuario.",
    });
  }
};

/**
 * Inicio de sesión.
 */
exports.iniciarSesion = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        mensaje: "Correo y contraseña son obligatorios.",
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const [resultados] = await pool.execute(
      `SELECT
          id_usuario,
          nombre,
          correo,
          contrasena_hash,
          rol,
          estado
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
      process.env.JWT_SECRET,
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
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);

    return res.status(500).json({
      mensaje: "Ocurrió un error al iniciar sesión.",
    });
  }
};