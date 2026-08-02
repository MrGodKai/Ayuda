const pool = require("../config/db");
const { GENEROS_DISPONIBLES } = require("../constants/generos");
const { urlAbsoluta } = require("../utils/urls");
const {
  rutaPublicaAudioCancion,
  rutaPublicaPortadaCancion,
  eliminarArchivoPublico,
} = require("../middleware/upload.middleware");

const SELECT_CANCION = `
  SELECT
    id_cancion,
    id_artista,
    titulo,
    album,
    genero,
    descripcion,
    duracion_segundos,
    portada_url,
    audio_url,
    estado,
    creado_en,
    actualizado_en
  FROM canciones
`;

function mapearCancion(fila) {
  return {
    id: fila.id_cancion,
    titulo: fila.titulo,
    album: fila.album || null,
    genero: fila.genero || null,
    descripcion: fila.descripcion || null,
    duracionSegundos: fila.duracion_segundos || null,
    audioUrl: urlAbsoluta(fila.audio_url),
    portadaUrl: urlAbsoluta(fila.portada_url),
    estado: Boolean(fila.estado),
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

async function obtenerArtistaDelUsuario(idUsuario) {
  const [filas] = await pool.execute(
    `SELECT id_artista, nombre FROM artistas WHERE id_usuario = ? LIMIT 1`,
    [idUsuario]
  );

  return filas[0] || null;
}

function validarDatosCancion({ titulo, genero, album, descripcion, duracionSegundos }) {
  const tituloLimpio = String(titulo || "").trim();

  if (!tituloLimpio) {
    return "El título es obligatorio.";
  }

  if (tituloLimpio.length > 150) {
    return "El título no puede superar 150 caracteres.";
  }

  const generoLimpio = String(genero || "").trim();

  if (!generoLimpio) {
    return "El género musical es obligatorio.";
  }

  if (!GENEROS_DISPONIBLES.includes(generoLimpio)) {
    return "El género seleccionado no es válido.";
  }

  const albumLimpio = String(album || "").trim();

  if (albumLimpio.length > 150) {
    return "El álbum no puede superar 150 caracteres.";
  }

  const descripcionLimpia = String(descripcion || "").trim();

  if (descripcionLimpia.length > 500) {
    return "La descripción no puede superar 500 caracteres.";
  }

  if (
    duracionSegundos !== undefined &&
    duracionSegundos !== null &&
    String(duracionSegundos).trim() !== ""
  ) {
    const numero = Number(duracionSegundos);

    if (!Number.isInteger(numero) || numero <= 0 || numero > 7200) {
      return "La duración indicada no es válida.";
    }
  }

  return null;
}

exports.obtenerMisCanciones = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const artista = await obtenerArtistaDelUsuario(idUsuario);

    if (!artista) {
      return res.status(200).json({ canciones: [] });
    }

    const [filas] = await pool.execute(
      `${SELECT_CANCION}
       WHERE id_artista = ?
         AND estado = TRUE
       ORDER BY creado_en DESC`,
      [artista.id_artista]
    );

    return res.status(200).json({
      canciones: filas.map(mapearCancion),
    });
  } catch (error) {
    console.error("Error al obtener las canciones del artista:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener tus canciones.",
    });
  }
};

exports.crearCancion = async (req, res) => {
  const archivos = req.files || {};
  const archivoAudio = archivos.audio?.[0] || null;
  const archivoPortada = archivos.portada?.[0] || null;

  const limpiarArchivosSubidos = () => {
    if (archivoAudio) {
      eliminarArchivoPublico(rutaPublicaAudioCancion(archivoAudio.filename));
    }

    if (archivoPortada) {
      eliminarArchivoPublico(rutaPublicaPortadaCancion(archivoPortada.filename));
    }
  };

  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      limpiarArchivosSubidos();

      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const artista = await obtenerArtistaDelUsuario(idUsuario);

    if (!artista) {
      limpiarArchivosSubidos();

      return res.status(400).json({
        mensaje:
          "Primero debes completar tu perfil de artista antes de publicar canciones.",
      });
    }

    if (!archivoAudio) {
      limpiarArchivosSubidos();

      return res.status(400).json({
        mensaje: "Debe adjuntar un archivo de audio.",
      });
    }

    const { titulo, album, genero, descripcion, duracionSegundos } = req.body;

    const errorValidacion = validarDatosCancion({
      titulo,
      genero,
      album,
      descripcion,
      duracionSegundos,
    });

    if (errorValidacion) {
      limpiarArchivosSubidos();

      return res.status(400).json({ mensaje: errorValidacion });
    }

    const audioUrl = rutaPublicaAudioCancion(archivoAudio.filename);
    const portadaUrl = archivoPortada
      ? rutaPublicaPortadaCancion(archivoPortada.filename)
      : null;

    const duracionLimpia = String(duracionSegundos || "").trim()
      ? Math.round(Number(duracionSegundos))
      : null;

    const [resultado] = await pool.execute(
      `INSERT INTO canciones (
         id_artista,
         titulo,
         artista,
         album,
         genero,
         duracion_segundos,
         portada_url,
         audio_url,
         descripcion,
         estado
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        artista.id_artista,
        String(titulo).trim(),
        artista.nombre,
        String(album || "").trim() || null,
        String(genero).trim(),
        duracionLimpia,
        portadaUrl,
        audioUrl,
        String(descripcion || "").trim() || null,
      ]
    );

    const [filas] = await pool.execute(
      `${SELECT_CANCION} WHERE id_cancion = ? LIMIT 1`,
      [resultado.insertId]
    );

    return res.status(201).json({
      mensaje: "Canción publicada correctamente.",
      cancion: mapearCancion(filas[0]),
    });
  } catch (error) {
    console.error("Error al publicar la canción:", error);
    limpiarArchivosSubidos();

    return res.status(500).json({
      mensaje: "No se pudo publicar la canción.",
    });
  }
};

exports.actualizarCancion = async (req, res) => {
  const archivos = req.files || {};
  const archivoAudio = archivos.audio?.[0] || null;
  const archivoPortada = archivos.portada?.[0] || null;

  const limpiarArchivosNuevos = () => {
    if (archivoAudio) {
      eliminarArchivoPublico(rutaPublicaAudioCancion(archivoAudio.filename));
    }

    if (archivoPortada) {
      eliminarArchivoPublico(rutaPublicaPortadaCancion(archivoPortada.filename));
    }
  };

  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      limpiarArchivosNuevos();

      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const idCancion = Number(req.params.id);

    if (!Number.isInteger(idCancion) || idCancion <= 0) {
      limpiarArchivosNuevos();

      return res.status(400).json({
        mensaje: "Identificador de canción inválido.",
      });
    }

    const artista = await obtenerArtistaDelUsuario(idUsuario);

    if (!artista) {
      limpiarArchivosNuevos();

      return res.status(400).json({
        mensaje: "Primero debes completar tu perfil de artista.",
      });
    }

    const [filasExistentes] = await pool.execute(
      `${SELECT_CANCION}
       WHERE id_cancion = ?
         AND id_artista = ?
         AND estado = TRUE
       LIMIT 1`,
      [idCancion, artista.id_artista]
    );

    if (filasExistentes.length === 0) {
      limpiarArchivosNuevos();

      return res.status(404).json({
        mensaje: "Canción no encontrada.",
      });
    }

    const cancionActual = filasExistentes[0];

    const { titulo, album, genero, descripcion, duracionSegundos } = req.body;

    const errorValidacion = validarDatosCancion({
      titulo,
      genero,
      album,
      descripcion,
      duracionSegundos,
    });

    if (errorValidacion) {
      limpiarArchivosNuevos();

      return res.status(400).json({ mensaje: errorValidacion });
    }

    const nuevoAudioUrl = archivoAudio
      ? rutaPublicaAudioCancion(archivoAudio.filename)
      : cancionActual.audio_url;

    const nuevaPortadaUrl = archivoPortada
      ? rutaPublicaPortadaCancion(archivoPortada.filename)
      : cancionActual.portada_url;

    const duracionLimpia = String(duracionSegundos || "").trim()
      ? Math.round(Number(duracionSegundos))
      : cancionActual.duracion_segundos;

    await pool.execute(
      `UPDATE canciones
       SET
         titulo = ?,
         album = ?,
         genero = ?,
         descripcion = ?,
         duracion_segundos = ?,
         audio_url = ?,
         portada_url = ?
       WHERE id_cancion = ?`,
      [
        String(titulo).trim(),
        String(album || "").trim() || null,
        String(genero).trim(),
        String(descripcion || "").trim() || null,
        duracionLimpia,
        nuevoAudioUrl,
        nuevaPortadaUrl,
        idCancion,
      ]
    );

    if (archivoAudio && cancionActual.audio_url) {
      eliminarArchivoPublico(cancionActual.audio_url);
    }

    if (archivoPortada && cancionActual.portada_url) {
      eliminarArchivoPublico(cancionActual.portada_url);
    }

    const [filasActualizadas] = await pool.execute(
      `${SELECT_CANCION} WHERE id_cancion = ? LIMIT 1`,
      [idCancion]
    );

    return res.status(200).json({
      mensaje: "Canción actualizada correctamente.",
      cancion: mapearCancion(filasActualizadas[0]),
    });
  } catch (error) {
    console.error("Error al actualizar la canción:", error);
    limpiarArchivosNuevos();

    return res.status(500).json({
      mensaje: "No se pudo actualizar la canción.",
    });
  }
};

exports.eliminarCancion = async (req, res) => {
  try {
    const idUsuario = req.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({
        mensaje: "No se pudo identificar al usuario.",
      });
    }

    const idCancion = Number(req.params.id);

    if (!Number.isInteger(idCancion) || idCancion <= 0) {
      return res.status(400).json({
        mensaje: "Identificador de canción inválido.",
      });
    }

    const artista = await obtenerArtistaDelUsuario(idUsuario);

    if (!artista) {
      return res.status(400).json({
        mensaje: "Primero debes completar tu perfil de artista.",
      });
    }

    const [resultado] = await pool.execute(
      `UPDATE canciones
       SET estado = FALSE
       WHERE id_cancion = ?
         AND id_artista = ?
         AND estado = TRUE`,
      [idCancion, artista.id_artista]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Canción no encontrada.",
      });
    }

    return res.status(200).json({
      mensaje: "Canción eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar la canción:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la canción.",
    });
  }
};
