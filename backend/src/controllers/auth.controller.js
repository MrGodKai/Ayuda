const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  buscarUsuarioPorCorreo,
  agregarUsuario,
} = require("../data/usuarios.mock");

const JWT_SECRET = process.env.JWT_SECRET || "istream-local-dev-secret";

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

    if (buscarUsuarioPorCorreo(correoNormalizado)) {
      return res.status(409).json({
        mensaje: "Ya existe un usuario con ese correo.",
      });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 12);
    const usuarioCreado = agregarUsuario({
      nombre,
      correo: correoNormalizado,
      contrasenaHash,
    });

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: {
        id: usuarioCreado.id_usuario,
        nombre: usuarioCreado.nombre,
        correo: usuarioCreado.correo,
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
    const usuario = buscarUsuarioPorCorreo(correoNormalizado);

    if (!usuario) {
      return res.status(401).json({
        mensaje: "Correo o contraseña incorrectos.",
      });
    }

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
    });
  }
};