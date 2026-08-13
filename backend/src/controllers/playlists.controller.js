const pool = require("../config/db");
const {
  rutaPublicaPortadaPlaylist,
  eliminarArchivoPublico,
} = require("../middleware/upload.middleware");

const SELECT_PLAYLIST = `
  SELECT
    id_playlist,
    id_usuario,
    nombre,
    descripcion,
    portada_url,
    publica,
    creado_en,
    actualizado_en
  FROM playlists
`;

function mapearPlaylistBase(fila) {
  return {
    id: fila.id_playlist,
    nombre: fila.nombre,
    descripcion: fila.descripcion || "",
    portada: fila.portada_url,
    publica: Boolean(fila.publica),
    creadoEn: fila.creado_en,
  };
}

function mapearCancionPlaylist(fila) {
  return {
    id: fila.id_playlist_cancion,
    idCancion: fila.id_cancion,
    titulo: fila.titulo_cancion,
    artista: fila.artista_cancion,
    album: fila.album_cancion,
    duracion: fila.duracion_segundos,
    portada: fila.portada_url,
    audioUrl: fila.audio_url,
  };
}

async function obtenerCancionesDePlaylist(idPlaylist) {
  const [filas] = await pool.execute(
    `SELECT
       id_playlist_cancion, id_cancion, titulo_cancion, artista_cancion,
       album_cancion, duracion_segundos, portada_url, audio_url
     FROM playlist_canciones
     WHERE id_playlist = ?
     ORDER BY agregado_en ASC`,
    [idPlaylist]
  );

  return filas.map(mapearCancionPlaylist);
}

async function obtenerPlaylistPropia(idPlaylist, idUsuario) {
  const [filas] = await pool.execute(
    `${SELECT_PLAYLIST} WHERE id_playlist = ? AND id_usuario = ? LIMIT 1`,
    [idPlaylist, idUsuario]
  );

  return filas[0] || null;
}

exports.listarMisPlaylists = async (req, res) => {
  try {
    const idUsuario = req.usuario.id;

    const [filas] = await pool.execute(
      `${SELECT_PLAYLIST} WHERE id_usuario = ? ORDER BY creado_en ASC`,
      [idUsuario]
    );

    const playlists = await Promise.all(
      filas.map(async (fila) => ({
        ...mapearPlaylistBase(fila),
        canciones: await obtenerCancionesDePlaylist(fila.id_playlist),
      }))
    );

    return res.status(200).json({ playlists });
  } catch (error) {
    console.error("Error al listar playlists:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener tus playlists.",
    });
  }
};

exports.crearPlaylist = async (req, res) => {
  try {
    const idUsuario = req.usuario.id;
    const nombre = String(req.body.nombre || "").trim();
    const descripcion = String(req.body.descripcion || "").trim();
    const publica = req.body.publica === undefined ? true : Boolean(req.body.publica);

    if (!nombre) {
      return res.status(400).json({
        mensaje: "El nombre de la playlist es obligatorio.",
      });
    }

    if (nombre.length > 150) {
      return res.status(400).json({
        mensaje: "El nombre no puede superar 150 caracteres.",
      });
    }

    if (descripcion.length > 500) {
      return res.status(400).json({
        mensaje: "La descripción no puede superar 500 caracteres.",
      });
    }

    const [resultado] = await pool.execute(
      `INSERT INTO playlists (id_usuario, nombre, descripcion, publica)
       VALUES (?, ?, ?, ?)`,
      [idUsuario, nombre, descripcion || null, publica]
    );

    const [filas] = await pool.execute(
      `${SELECT_PLAYLIST} WHERE id_playlist = ? LIMIT 1`,
      [resultado.insertId]
    );

    return res.status(201).json({
      mensaje: "Playlist creada correctamente.",
      playlist: { ...mapearPlaylistBase(filas[0]), canciones: [] },
    });
  } catch (error) {
    console.error("Error al crear playlist:", error);

    return res.status(500).json({
      mensaje: "No se pudo crear la playlist.",
    });
  }
};

exports.actualizarPlaylist = async (req, res) => {
  try {
    const idUsuario = req.usuario.id;
    const idPlaylist = Number(req.params.id);

    if (!Number.isInteger(idPlaylist) || idPlaylist <= 0) {
      return res.status(400).json({
        mensaje: "El identificador de la playlist no es válido.",
      });
    }

    const playlistExistente = await obtenerPlaylistPropia(idPlaylist, idUsuario);

    if (!playlistExistente) {
      return res.status(404).json({
        mensaje: "Playlist no encontrada.",
      });
    }

    const cambios = [];
    const valores = [];

    if (req.body.nombre !== undefined) {
      const nombre = String(req.body.nombre || "").trim();

      if (!nombre) {
        return res.status(400).json({
          mensaje: "El nombre de la playlist es obligatorio.",
        });
      }

      if (nombre.length > 150) {
        return res.status(400).json({
          mensaje: "El nombre no puede superar 150 caracteres.",
        });
      }

      cambios.push("nombre = ?");
      valores.push(nombre);
    }

    if (req.body.descripcion !== undefined) {
      const descripcion = String(req.body.descripcion || "").trim();

      if (descripcion.length > 500) {
        return res.status(400).json({
          mensaje: "La descripción no puede superar 500 caracteres.",
        });
      }

      cambios.push("descripcion = ?");
      valores.push(descripcion || null);
    }

    if (req.body.publica !== undefined) {
      cambios.push("publica = ?");
      valores.push(Boolean(req.body.publica));
    }

    if (cambios.length === 0) {
      return res.status(400).json({
        mensaje: "No hay cambios para aplicar.",
      });
    }

    valores.push(idPlaylist, idUsuario);

    await pool.execute(
      `UPDATE playlists SET ${cambios.join(", ")} WHERE id_playlist = ? AND id_usuario = ?`,
      valores
    );

    const [filas] = await pool.execute(
      `${SELECT_PLAYLIST} WHERE id_playlist = ? LIMIT 1`,
      [idPlaylist]
    );

    return res.status(200).json({
      mensaje: "Playlist actualizada correctamente.",
      playlist: mapearPlaylistBase(filas[0]),
    });
  } catch (error) {
    console.error("Error al actualizar playlist:", error);

    return res.status(500).json({
      mensaje: "No se pudo actualizar la playlist.",
    });
  }
};

exports.eliminarPlaylist = async (req, res) => {
  try {
    const idUsuario = req.usuario.id;
    const idPlaylist = Number(req.params.id);

    if (!Number.isInteger(idPlaylist) || idPlaylist <= 0) {
      return res.status(400).json({
        mensaje: "El identificador de la playlist no es válido.",
      });
    }

    const playlistExistente = await obtenerPlaylistPropia(idPlaylist, idUsuario);

    if (!playlistExistente) {
      return res.status(404).json({
        mensaje: "Playlist no encontrada.",
      });
    }

    await pool.execute(
      `DELETE FROM playlists WHERE id_playlist = ? AND id_usuario = ?`,
      [idPlaylist, idUsuario]
    );

    if (playlistExistente.portada_url) {
      eliminarArchivoPublico(playlistExistente.portada_url);
    }

    return res.status(200).json({
      mensaje: "Playlist eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar playlist:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la playlist.",
    });
  }
};

exports.subirPortadaPlaylist = async (req, res) => {
  try {
    const idUsuario = req.usuario.id;
    const idPlaylist = Number(req.params.id);

    if (!Number.isInteger(idPlaylist) || idPlaylist <= 0) {
      return res.status(400).json({
        mensaje: "El identificador de la playlist no es válido.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        mensaje: "Debe adjuntar una imagen de portada.",
      });
    }

    const playlistExistente = await obtenerPlaylistPropia(idPlaylist, idUsuario);

    if (!playlistExistente) {
      return res.status(404).json({
        mensaje: "Playlist no encontrada.",
      });
    }

    const nuevaRuta = rutaPublicaPortadaPlaylist(req.file.filename);

    await pool.execute(
      `UPDATE playlists SET portada_url = ? WHERE id_playlist = ? AND id_usuario = ?`,
      [nuevaRuta, idPlaylist, idUsuario]
    );

    if (playlistExistente.portada_url) {
      eliminarArchivoPublico(playlistExistente.portada_url);
    }

    return res.status(200).json({
      mensaje: "Portada actualizada correctamente.",
      portada: nuevaRuta,
    });
  } catch (error) {
    console.error("Error al subir la portada de la playlist:", error);

    return res.status(500).json({
      mensaje: "No se pudo subir la portada.",
    });
  }
};

exports.agregarCancionAPlaylist = async (req, res) => {
  try {
    const idUsuario = req.usuario.id;
    const idPlaylist = Number(req.params.id);

    if (!Number.isInteger(idPlaylist) || idPlaylist <= 0) {
      return res.status(400).json({
        mensaje: "El identificador de la playlist no es válido.",
      });
    }

    const playlistExistente = await obtenerPlaylistPropia(idPlaylist, idUsuario);

    if (!playlistExistente) {
      return res.status(404).json({
        mensaje: "Playlist no encontrada.",
      });
    }

    const idCancionRecibido = Number(req.body.idCancion);
    const idCancion =
      Number.isInteger(idCancionRecibido) && idCancionRecibido > 0
        ? idCancionRecibido
        : null;

    const titulo = String(req.body.titulo || "").trim();
    const artista = String(req.body.artista || "").trim();
    const album = String(req.body.album || "").trim();
    const duracionRecibida = Number(req.body.duracion);
    const duracion = Number.isFinite(duracionRecibida) && duracionRecibida > 0 ? duracionRecibida : null;
    const portada = String(req.body.portada || "").trim();
    const audioUrl = String(req.body.audioUrl || "").trim();

    if (!titulo || !artista) {
      return res.status(400).json({
        mensaje: "Debe indicar al menos título y artista.",
      });
    }

    const [existentes] = await pool.execute(
      `SELECT id_playlist_cancion FROM playlist_canciones
       WHERE id_playlist = ? AND titulo_cancion = ? AND artista_cancion = ?
       LIMIT 1`,
      [idPlaylist, titulo, artista]
    );

    if (existentes.length > 0) {
      return res.status(200).json({
        mensaje: "La canción ya estaba en la playlist.",
        yaExistia: true,
      });
    }

    const [resultado] = await pool.execute(
      `INSERT INTO playlist_canciones
       (id_playlist, id_cancion, titulo_cancion, artista_cancion, album_cancion, duracion_segundos, portada_url, audio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idPlaylist,
        idCancion,
        titulo,
        artista,
        album || null,
        duracion,
        portada || null,
        audioUrl || null,
      ]
    );

    const [filas] = await pool.execute(
      `SELECT id_playlist_cancion, id_cancion, titulo_cancion, artista_cancion, album_cancion, duracion_segundos, portada_url, audio_url
       FROM playlist_canciones
       WHERE id_playlist_cancion = ?`,
      [resultado.insertId]
    );

    return res.status(201).json({
      mensaje: "Canción agregada a la playlist.",
      cancion: mapearCancionPlaylist(filas[0]),
    });
  } catch (error) {
    console.error("Error al agregar canción a playlist:", error);

    return res.status(500).json({
      mensaje: "No se pudo agregar la canción.",
    });
  }
};

exports.eliminarCancionDePlaylist = async (req, res) => {
  try {
    const idUsuario = req.usuario.id;
    const idPlaylist = Number(req.params.id);
    const idPlaylistCancion = Number(req.params.idCancion);

    if (
      !Number.isInteger(idPlaylist) ||
      idPlaylist <= 0 ||
      !Number.isInteger(idPlaylistCancion) ||
      idPlaylistCancion <= 0
    ) {
      return res.status(400).json({
        mensaje: "Identificadores no válidos.",
      });
    }

    const playlistExistente = await obtenerPlaylistPropia(idPlaylist, idUsuario);

    if (!playlistExistente) {
      return res.status(404).json({
        mensaje: "Playlist no encontrada.",
      });
    }

    const [resultado] = await pool.execute(
      `DELETE FROM playlist_canciones WHERE id_playlist_cancion = ? AND id_playlist = ?`,
      [idPlaylistCancion, idPlaylist]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "La canción no está en esta playlist.",
      });
    }

    return res.status(200).json({
      mensaje: "Canción eliminada de la playlist.",
    });
  } catch (error) {
    console.error("Error al eliminar canción de playlist:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar la canción.",
    });
  }
};
