const pool = require("../config/db");
const { GENEROS_DISPONIBLES } = require("../constants/generos");
const {
  rutaPublicaFoto,
  rutaPublicaPortada,
  eliminarArchivoPublico,
} = require("../middleware/upload.middleware");

const SELECT_PERFIL = `
  SELECT
    id_artista,
    id_usuario,
    nombre,
    biografia,
    foto_url,
    portada_url,
    generos,
    fecha_debut,
    estado,
    creado_en,
    actualizado_en
  FROM artistas
`;

function formatearFechaDebut(fecha) {
  if (!fecha) {
    return null;
  }

  const fechaObjeto = new Date(fecha);

  if (Number.isNaN(fechaObjeto.getTime())) {
    return null;
  }

  const anio = fechaObjeto.getUTCFullYear();
  const mes = String(fechaObjeto.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fechaObjeto.getUTCDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function mapearPerfilArtista(fila) {
  return {
    id: fila.id_artista,
    nombreArtistico: fila.nombre,
    biografia: fila.biografia || "",
    fotoUrl: fila.foto_url || null,
    portadaUrl: fila.portada_url || null,
    generos: String(fila.generos || "")
      .split(",")
      .map((genero) => genero.trim())
      .filter(Boolean),
    fechaDebut: formatearFechaDebut(fila.fecha_debut),
    estado: Boolean(fila.estado),
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

/**
 * Obtiene la fila de artistas ligada al usuario autenticado.
 * Si el usuario nunca administró su perfil, la crea de forma
 * perezosa para que exista desde el primer acceso.
 */
async function obtenerOcrearPerfil(idUsuario, nombreUsuario) {
  const [filas] = await pool.execute(
    `${SELECT_PERFIL} WHERE id_usuario = ? LIMIT 1`,
    [idUsuario]
  );

  if (filas.length > 0) {
    return filas[0];
  }

  const nombreBase =
    String(nombreUsuario || "").trim() || "Artista";

  let idArtista;

  try {
    const [resultado] = await pool.execute(
      `INSERT INTO artistas (id_usuario, nombre) VALUES (?, ?)`,
      [idUsuario, nombreBase]
    );

    idArtista = resultado.insertId;
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") {
      throw error;
    }

    // Otro artista ya usa ese nombre: se agrega un sufijo único.
    const [resultado] = await pool.execute(
      `INSERT INTO artistas (id_usuario, nombre) VALUES (?, ?)`,
      [idUsuario, `${nombreBase} #${idUsuario}`]
    );

    idArtista = resultado.insertId;
  }

  const [filasNuevas] = await pool.execute(
    `${SELECT_PERFIL} WHERE id_artista = ? LIMIT 1`,
    [idArtista]
  );

  return filasNuevas[0];
}

function validarPerfilArtista({ nombreArtistico, generos, fechaDebut }) {
  const nombreLimpio = String(nombreArtistico || "").trim();
  const fechaDebutLimpia = String(fechaDebut || "").trim();

  if (!nombreLimpio) {
    return "El nombre artístico es obligatorio.";
  }

  if (nombreLimpio.length < 2) {
    return "El nombre artístico debe tener al menos 2 caracteres.";
  }

  if (nombreLimpio.length > 150) {
    return "El nombre artístico no puede superar 150 caracteres.";
  }

  if (!Array.isArray(generos) || generos.length === 0) {
    return "Debe seleccionar al menos un género musical.";
  }

  if (generos.length > 5) {
    return "Puede seleccionar como máximo 5 géneros musicales.";
  }

  const generosInvalidos = generos.filter(
    (genero) => !GENEROS_DISPONIBLES.includes(genero)
  );

  if (generosInvalidos.length > 0) {
    return `Los siguientes géneros no son válidos: ${generosInvalidos.join(", ")}.`;
  }

  if (fechaDebutLimpia) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDebutLimpia)) {
      return "La fecha de debut no tiene un formato válido.";
    }

    const hoy = new Date().toISOString().slice(0, 10);

    if (fechaDebutLimpia > hoy) {
      return "La fecha de debut no puede ser futura.";
    }
  }

  return null;
}

exports.obtenerGenerosDisponibles = (req, res) => {
  return res.status(200).json({
    generos: GENEROS_DISPONIBLES,
  });
};

exports.obtenerMiPerfilArtista = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const perfil = await obtenerOcrearPerfil(
      idUsuario,
      req.usuario.nombre
    );

    return res.status(200).json({
      perfil: mapearPerfilArtista(perfil),
    });
  } catch (error) {
    console.error(
      "Error al obtener el perfil de artista:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo obtener el perfil de artista.",
    });
  }
};

exports.actualizarMiPerfilArtista = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const { nombreArtistico, generos, fechaDebut } = req.body;

    const errorValidacion = validarPerfilArtista({
      nombreArtistico,
      generos,
      fechaDebut,
    });

    if (errorValidacion) {
      return res.status(400).json({
        mensaje: errorValidacion,
      });
    }

    const perfilActual = await obtenerOcrearPerfil(
      idUsuario,
      req.usuario.nombre
    );

    const nombreLimpio = String(nombreArtistico).trim();
    const generosTexto = [...new Set(generos)].join(", ");
    const fechaDebutLimpia = String(fechaDebut || "").trim() || null;

    const [choqueNombre] = await pool.execute(
      `SELECT id_artista
       FROM artistas
       WHERE nombre = ?
         AND id_artista <> ?
       LIMIT 1`,
      [nombreLimpio, perfilActual.id_artista]
    );

    if (choqueNombre.length > 0) {
      return res.status(409).json({
        mensaje:
          "Ese nombre artístico ya está en uso por otro artista.",
      });
    }

    await pool.execute(
      `UPDATE artistas
       SET
         nombre = ?,
         generos = ?,
         fecha_debut = ?
       WHERE id_artista = ?`,
      [
        nombreLimpio,
        generosTexto,
        fechaDebutLimpia,
        perfilActual.id_artista,
      ]
    );

    const [filas] = await pool.execute(
      `${SELECT_PERFIL} WHERE id_artista = ? LIMIT 1`,
      [perfilActual.id_artista]
    );

    return res.status(200).json({
      mensaje: "Perfil de artista actualizado correctamente.",
      perfil: mapearPerfilArtista(filas[0]),
    });
  } catch (error) {
    console.error(
      "Error al actualizar el perfil de artista:",
      error
    );

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje:
          "Ese nombre artístico ya está en uso por otro artista.",
      });
    }

    return res.status(500).json({
      mensaje: "No se pudo actualizar el perfil de artista.",
    });
  }
};

exports.subirFotoPerfilArtista = async (req, res) => {
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

    const perfil = await obtenerOcrearPerfil(
      idUsuario,
      req.usuario.nombre
    );

    const nuevaRuta = rutaPublicaFoto(req.file.filename);

    await pool.execute(
      `UPDATE artistas SET foto_url = ? WHERE id_artista = ?`,
      [nuevaRuta, perfil.id_artista]
    );

    if (perfil.foto_url) {
      eliminarArchivoPublico(perfil.foto_url);
    }

    return res.status(200).json({
      mensaje: "Foto de perfil actualizada correctamente.",
      fotoUrl: nuevaRuta,
    });
  } catch (error) {
    console.error(
      "Error al subir la foto de perfil del artista:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo subir la foto de perfil.",
    });
  }
};

exports.subirPortadaArtista = async (req, res) => {
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

    const perfil = await obtenerOcrearPerfil(
      idUsuario,
      req.usuario.nombre
    );

    const nuevaRuta = rutaPublicaPortada(req.file.filename);

    await pool.execute(
      `UPDATE artistas SET portada_url = ? WHERE id_artista = ?`,
      [nuevaRuta, perfil.id_artista]
    );

    if (perfil.portada_url) {
      eliminarArchivoPublico(perfil.portada_url);
    }

    return res.status(200).json({
      mensaje: "Portada actualizada correctamente.",
      portadaUrl: nuevaRuta,
    });
  } catch (error) {
    console.error(
      "Error al subir la portada del artista:",
      error
    );

    return res.status(500).json({
      mensaje: "No se pudo subir la portada.",
    });
  }
};
