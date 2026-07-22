const pool = require("../config/db");

function mapearFavorito(fila) {
  return {
    id: fila.id_favorito,
    cancion: {
      id: fila.id_cancion,
      titulo: fila.titulo_cancion,
      artista: fila.artista_cancion,
      album: fila.album_cancion,
      audioUrl: fila.audio_url,
    },
    creadoEn: fila.creado_en,
  };
}

exports.obtenerFavoritosUsuario = async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT
         id_favorito,
         id_cancion,
         titulo_cancion,
         artista_cancion,
         album_cancion,
         audio_url,
         creado_en
       FROM canciones_favoritas
       WHERE id_usuario = ?
       ORDER BY creado_en DESC, id_favorito DESC`,
      [req.usuario.id]
    );

    return res.status(200).json({
      favoritos: filas.map(mapearFavorito),
    });
  } catch (error) {
    console.error("Error al obtener favoritos:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener las canciones favoritas.",
    });
  }
};

exports.agregarFavorito = async (req, res) => {
  try {
    const idCancionRecibido = Number(req.body.idCancion);
    const idCancion = Number.isInteger(idCancionRecibido) && idCancionRecibido > 0
      ? idCancionRecibido
      : null;

    const tituloCancion = String(req.body.titulo || "").trim();
    const artistaCancion = String(req.body.artista || "").trim();
    const albumCancion = String(req.body.album || "").trim();
    const audioUrl = String(req.body.audioUrl || "").trim();

    if (!tituloCancion || !artistaCancion) {
      return res.status(400).json({
        mensaje: "Debe indicar al menos titulo y artista.",
      });
    }

    const [existentes] = await pool.execute(
      `SELECT
         id_favorito,
         id_cancion,
         titulo_cancion,
         artista_cancion,
         album_cancion,
         audio_url,
         creado_en
       FROM canciones_favoritas
       WHERE id_usuario = ?
         AND titulo_cancion = ?
         AND artista_cancion = ?
       LIMIT 1`,
      [req.usuario.id, tituloCancion, artistaCancion]
    );

    if (existentes.length > 0) {
      return res.status(200).json({
        mensaje: "La cancion ya estaba en favoritos.",
        favorito: mapearFavorito(existentes[0]),
      });
    }

    const [resultado] = await pool.execute(
      `INSERT INTO canciones_favoritas
       (
         id_usuario,
         id_cancion,
         titulo_cancion,
         artista_cancion,
         album_cancion,
         audio_url
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.usuario.id,
        idCancion,
        tituloCancion,
        artistaCancion,
        albumCancion || null,
        audioUrl || null,
      ]
    );

    const [filas] = await pool.execute(
      `SELECT
         id_favorito,
         id_cancion,
         titulo_cancion,
         artista_cancion,
         album_cancion,
         audio_url,
         creado_en
       FROM canciones_favoritas
       WHERE id_favorito = ?
         AND id_usuario = ?
       LIMIT 1`,
      [resultado.insertId, req.usuario.id]
    );

    return res.status(201).json({
      mensaje: "Cancion agregada a favoritos.",
      favorito: filas[0] ? mapearFavorito(filas[0]) : null,
    });
  } catch (error) {
    console.error("Error al agregar favorito:", error);

    return res.status(500).json({
      mensaje: "No se pudo agregar la cancion a favoritos.",
    });
  }
};

exports.eliminarFavorito = async (req, res) => {
  try {
    const idFavorito = Number(req.params.id);

    if (!Number.isInteger(idFavorito) || idFavorito <= 0) {
      return res.status(400).json({
        mensaje: "El identificador del favorito no es valido.",
      });
    }

    const [resultado] = await pool.execute(
      `DELETE FROM canciones_favoritas
       WHERE id_favorito = ?
         AND id_usuario = ?`,
      [idFavorito, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Favorito no encontrado.",
      });
    }

    return res.status(200).json({
      mensaje: "Favorito eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar favorito:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar el favorito.",
    });
  }
};
