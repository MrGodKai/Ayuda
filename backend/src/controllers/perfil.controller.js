const {
  buscarUsuarioPorId,
  actualizarUsuario,
  obtenerTodosLosUsuarios,
} = require("../data/usuarios.mock");

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validarActualizacionPerfil({ nombre, correo, fotoPerfil, telefono, ciudad }) {
  if (!nombre || !nombre.trim()) {
    return "El nombre es obligatorio.";
  }

  if (nombre.trim().length < 2) {
    return "El nombre debe tener al menos 2 caracteres.";
  }

  if (!correo || !correo.trim()) {
    return "El correo es obligatorio.";
  }

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correoValido.test(correo.trim())) {
    return "El correo no tiene un formato válido.";
  }

  if (telefono && telefono.trim() && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s0-9]{6,}$/.test(telefono.trim())) {
    return "El teléfono no tiene un formato válido.";
  }

  if (fotoPerfil && fotoPerfil.trim() && !/^https?:\/\//.test(fotoPerfil.trim())) {
    return "La foto de perfil debe ser una URL válida.";
  }

  if (ciudad && ciudad.trim().length > 100) {
    return "La ciudad no puede superar 100 caracteres.";
  }

  return null;
}

exports.obtenerPerfil = async (req, res) => {
  try {
    const usuario = buscarUsuarioPorId(req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    return res.status(200).json({
      usuario,
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return res.status(500).json({ mensaje: "No se pudo obtener el perfil." });
  }
};

exports.actualizarPerfil = async (req, res) => {
  try {
    const { nombre, correo, fotoPerfil, telefono, ciudad } = req.body;

    const errorValidacion = validarActualizacionPerfil({
      nombre,
      correo,
      fotoPerfil,
      telefono,
      ciudad,
    });

    if (errorValidacion) {
      return res.status(400).json({ mensaje: errorValidacion });
    }

    const correoNormalizado = normalizarEmail(correo);

    const usuariosExistentes = obtenerTodosLosUsuarios().filter(
      (usuario) => usuario.correo === correoNormalizado && usuario.id_usuario !== req.usuario.id
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        mensaje: "El correo ya está en uso por otro usuario.",
      });
    }

    const usuarioActualizado = actualizarUsuario(req.usuario.id, {
      nombre: nombre.trim(),
      correo: correoNormalizado,
      foto_perfil: fotoPerfil?.trim() || null,
      telefono: telefono?.trim() || null,
      ciudad: ciudad?.trim() || null,
    });

    if (!usuarioActualizado) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    return res.status(200).json({
      mensaje: "Perfil actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return res.status(500).json({ mensaje: "No se pudo actualizar el perfil." });
  }
};
