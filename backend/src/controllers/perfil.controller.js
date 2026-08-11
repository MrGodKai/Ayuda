const pool = require("../config/db");
const {
  rutaPublicaFotoUsuario,
  rutaPublicaPortadaUsuario,
  eliminarArchivoPublico,
} = require("../middleware/upload.middleware");

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validarActualizacionPerfil({
  nombre,
  correo,
  fotoPerfil,
  telefono,
  ciudad,
  biografia,
}) {
  const nombreLimpio = String(nombre || "").trim();
  const correoLimpio = String(correo || "").trim();
  const fotoLimpia = String(fotoPerfil || "").trim();
  const telefonoLimpio = String(telefono || "").trim();
  const ciudadLimpia = String(ciudad || "").trim();
  const biografiaLimpia = String(biografia || "").trim();

  if (!nombreLimpio) {
    return "El nombre es obligatorio.";
  }

  if (nombreLimpio.length < 2) {
    return "El nombre debe tener al menos 2 caracteres.";
  }

  if (nombreLimpio.length > 100) {
    return "El nombre no puede superar 100 caracteres.";
  }

  if (!correoLimpio) {
    return "El correo es obligatorio.";
  }

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!correoValido.test(correoLimpio)) {
    return "El correo no tiene un formato válido.";
  }

  if (correoLimpio.length > 150) {
    return "El correo no puede superar 150 caracteres.";
  }

  if (
    telefonoLimpio &&
    !/^[+]?[(]?[0-9]{1,4}[)]?[-\s0-9]{6,}$/.test(
      telefonoLimpio
    )
  ) {
    return "El teléfono no tiene un formato válido.";
  }

  if (telefonoLimpio.length > 30) {
    return "El teléfono no puede superar 30 caracteres.";
  }

  if (
    fotoLimpia &&
    !/^(https?:\/\/\S+|\/uploads\/[\w\-./]+)$/i.test(fotoLimpia)
  ) {
    return "La foto de perfil debe ser una URL válida.";
  }

  if (fotoLimpia.length > 500) {
    return "La URL de la foto no puede superar 500 caracteres.";
  }

  if (ciudadLimpia.length > 100) {
    return "La ciudad no puede superar 100 caracteres.";
  }

  if (biografiaLimpia.length > 500) {
    return "La biografía no puede superar 500 caracteres.";
  }

  return null;
}

/**
 * Obtiene el perfil del usuario autenticado desde MySQL.
 */
exports.obtenerPerfil = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const [resultados] = await pool.execute(
      `SELECT
         id_usuario,
         nombre,
         correo,
         rol,
         estado,
         perfil_privado,
         foto_perfil,
         portada_url,
         biografia,
         telefono,
         ciudad,
         creado_en,
         actualizado_en
       FROM usuarios
       WHERE id_usuario = ?
       LIMIT 1`,
      [idUsuario]
    );

    if (resultados.length === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado.",
      });
    }

    const usuario = resultados[0];

    return res.status(200).json({
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: Boolean(usuario.estado),
        perfilPrivado: Boolean(usuario.perfil_privado),
        fotoPerfil: usuario.foto_perfil,
        portadaUrl: usuario.portada_url,
        biografia: usuario.biografia || "",
        telefono: usuario.telefono,
        ciudad: usuario.ciudad,
        creadoEn: usuario.creado_en,
        actualizadoEn: usuario.actualizado_en,
      },
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);

    return res.status(500).json({
      mensaje: "No se pudo obtener el perfil.",
    });
  }
};

/**
 * Actualiza el perfil del usuario autenticado en MySQL.
 */
exports.actualizarPerfil = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const {
      nombre,
      correo,
      fotoPerfil,
      telefono,
      ciudad,
      biografia,
    } = req.body;

    const errorValidacion = validarActualizacionPerfil({
      nombre,
      correo,
      fotoPerfil,
      telefono,
      ciudad,
      biografia,
    });

    if (errorValidacion) {
      return res.status(400).json({
        mensaje: errorValidacion,
      });
    }

    const nombreLimpio = String(nombre).trim();
    const correoNormalizado = normalizarEmail(correo);
    const fotoLimpia =
      String(fotoPerfil || "").trim() || null;
    const telefonoLimpio =
      String(telefono || "").trim() || null;
    const ciudadLimpia =
      String(ciudad || "").trim() || null;
    const biografiaLimpia =
      String(biografia || "").trim() || null;

    // Comprobar que el usuario exista.
    const [usuarioEncontrado] = await pool.execute(
      `SELECT id_usuario
       FROM usuarios
       WHERE id_usuario = ?
       LIMIT 1`,
      [idUsuario]
    );

    if (usuarioEncontrado.length === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado.",
      });
    }

    // Comprobar que el correo no pertenezca a otro usuario.
    const [usuariosConCorreo] = await pool.execute(
      `SELECT id_usuario
       FROM usuarios
       WHERE correo = ?
         AND id_usuario <> ?
       LIMIT 1`,
      [correoNormalizado, idUsuario]
    );

    if (usuariosConCorreo.length > 0) {
      return res.status(409).json({
        mensaje:
          "El correo ya está en uso por otro usuario.",
      });
    }

    // Actualizar los datos.
    await pool.execute(
      `UPDATE usuarios
       SET
         nombre = ?,
         correo = ?,
         foto_perfil = ?,
         telefono = ?,
         ciudad = ?,
         biografia = ?
       WHERE id_usuario = ?`,
      [
        nombreLimpio,
        correoNormalizado,
        fotoLimpia,
        telefonoLimpio,
        ciudadLimpia,
        biografiaLimpia,
        idUsuario,
      ]
    );

    // Consultar y devolver el perfil actualizado.
    const [resultados] = await pool.execute(
      `SELECT
         id_usuario,
         nombre,
         correo,
         rol,
         estado,
         perfil_privado,
         foto_perfil,
         portada_url,
         biografia,
         telefono,
         ciudad,
         creado_en,
         actualizado_en
       FROM usuarios
       WHERE id_usuario = ?
       LIMIT 1`,
      [idUsuario]
    );

    const usuario = resultados[0];

    return res.status(200).json({
      mensaje: "Perfil actualizado correctamente.",
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: Boolean(usuario.estado),
        perfilPrivado: Boolean(usuario.perfil_privado),
        fotoPerfil: usuario.foto_perfil,
        portadaUrl: usuario.portada_url,
        biografia: usuario.biografia || "",
        telefono: usuario.telefono,
        ciudad: usuario.ciudad,
        creadoEn: usuario.creado_en,
        actualizadoEn: usuario.actualizado_en,
      },
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje:
          "El correo ya está en uso por otro usuario.",
      });
    }

    return res.status(500).json({
      mensaje: "No se pudo actualizar el perfil.",
    });
  }
};

exports.actualizarPrivacidad = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;
    const privado = req.body.privado;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    if (typeof privado !== "boolean") {
      return res.status(400).json({
        mensaje: "El valor de privacidad debe ser verdadero o falso.",
      });
    }

    await pool.execute(
      `UPDATE usuarios SET perfil_privado = ? WHERE id_usuario = ?`,
      [privado ? 1 : 0, idUsuario]
    );

    return res.status(200).json({
      mensaje: privado
        ? "Tu perfil ahora es privado."
        : "Tu perfil ahora es público.",
      perfilPrivado: privado,
    });
  } catch (error) {
    console.error("Error al actualizar privacidad:", error);
    return res.status(500).json({
      mensaje: "No se pudo actualizar la configuración de privacidad.",
    });
  }
};

exports.subirFotoPerfilUsuario = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        mensaje: "Debe adjuntar una imagen de perfil.",
      });
    }

    const [filas] = await pool.execute(
      `SELECT foto_perfil FROM usuarios WHERE id_usuario = ? LIMIT 1`,
      [idUsuario]
    );

    const fotoAnterior = filas[0]?.foto_perfil || null;
    const nuevaRuta = rutaPublicaFotoUsuario(req.file.filename);

    await pool.execute(
      `UPDATE usuarios SET foto_perfil = ? WHERE id_usuario = ?`,
      [nuevaRuta, idUsuario]
    );

    if (fotoAnterior) {
      eliminarArchivoPublico(fotoAnterior);
    }

    return res.status(200).json({
      mensaje: "Foto de perfil actualizada correctamente.",
      fotoPerfil: nuevaRuta,
    });
  } catch (error) {
    console.error("Error al subir la foto de perfil del usuario:", error);

    return res.status(500).json({
      mensaje: "No se pudo subir la foto de perfil.",
    });
  }
};

exports.subirPortadaUsuario = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        mensaje: "Debe adjuntar una imagen de portada.",
      });
    }

    const [filas] = await pool.execute(
      `SELECT portada_url FROM usuarios WHERE id_usuario = ? LIMIT 1`,
      [idUsuario]
    );

    const portadaAnterior = filas[0]?.portada_url || null;
    const nuevaRuta = rutaPublicaPortadaUsuario(req.file.filename);

    await pool.execute(
      `UPDATE usuarios SET portada_url = ? WHERE id_usuario = ?`,
      [nuevaRuta, idUsuario]
    );

    if (portadaAnterior) {
      eliminarArchivoPublico(portadaAnterior);
    }

    return res.status(200).json({
      mensaje: "Portada actualizada correctamente.",
      portadaUrl: nuevaRuta,
    });
  } catch (error) {
    console.error("Error al subir la portada del usuario:", error);

    return res.status(500).json({
      mensaje: "No se pudo subir la portada.",
    });
  }
};