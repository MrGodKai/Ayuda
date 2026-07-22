const pool = require("../config/db");

function mapearRegistro(fila) {
  return {
    id: fila.id_historial,
    cancion: {
      id: fila.id_cancion,
      titulo: fila.titulo_cancion,
      artista: fila.artista_cancion,
      album: fila.album_cancion,
    },
    reproducidoEn: fila.reproducido_en,
  };
}

exports.obtenerHistorialUsuario = async (req, res) => {
  try {
    const [filas] = await pool.execute(
      `SELECT
         id_historial,
         id_cancion,
         titulo_cancion,
         artista_cancion,
         album_cancion,
         reproducido_en
       FROM historial_reproducciones
       WHERE id_usuario = ?
       ORDER BY reproducido_en DESC, id_historial DESC
       LIMIT 200`,
      [req.usuario.id]
    );

    return res.status(200).json({
      historial: filas.map(mapearRegistro),
    });
  } catch (error) {
    console.error("Error al obtener historial:", error);

    return res.status(500).json({
      mensaje: "No se pudo obtener el historial de reproducciones.",
    });
  }
};

exports.registrarReproduccion = async (req, res) => {
  try {
    const idCancion = Number(req.body.idCancion);
    const tituloCancion = String(req.body.titulo || "").trim();
    const artistaCancion = String(req.body.artista || "").trim();
    const albumCancion = String(req.body.album || "").trim();

    if (!tituloCancion || !artistaCancion) {
      return res.status(400).json({
        mensaje: "Debe indicar al menos título y artista.",
      });
    }

    const idCancionValido = Number.isInteger(idCancion) && idCancion > 0 ? idCancion : null;

    const [resultado] = await pool.execute(
      `INSERT INTO historial_reproducciones
       (
         id_usuario,
         id_cancion,
         titulo_cancion,
         artista_cancion,
         album_cancion
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.usuario.id,
        idCancionValido,
        tituloCancion,
        artistaCancion,
        albumCancion || null,
      ]
    );

    const [filas] = await pool.execute(
      `SELECT
         id_historial,
         id_cancion,
         titulo_cancion,
         artista_cancion,
         album_cancion,
         reproducido_en
       FROM historial_reproducciones
       WHERE id_historial = ?
         AND id_usuario = ?
       LIMIT 1`,
      [resultado.insertId, req.usuario.id]
    );

    return res.status(201).json({
      mensaje: "Reproduccion registrada.",
      registro: filas[0] ? mapearRegistro(filas[0]) : null,
    });
  } catch (error) {
    console.error("Error al registrar reproduccion:", error);

    return res.status(500).json({
      mensaje: "No se pudo registrar la reproduccion.",
    });
  }
};

exports.eliminarRegistroHistorial = async (req, res) => {
  try {
    const idRegistro = Number(req.params.id);

    if (!Number.isInteger(idRegistro) || idRegistro <= 0) {
      return res.status(400).json({
        mensaje: "El identificador del historial no es valido.",
      });
    }

    const [resultado] = await pool.execute(
      `DELETE FROM historial_reproducciones
       WHERE id_historial = ?
         AND id_usuario = ?`,
      [idRegistro, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Registro no encontrado.",
      });
    }

    return res.status(200).json({
      mensaje: "Registro eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar registro de historial:", error);

    return res.status(500).json({
      mensaje: "No se pudo eliminar el registro del historial.",
    });
  }
};

exports.limpiarHistorialUsuario = async (req, res) => {
  try {
    const [resultado] = await pool.execute(
      `DELETE FROM historial_reproducciones
       WHERE id_usuario = ?`,
      [req.usuario.id]
    );

    return res.status(200).json({
      mensaje: "Historial limpiado correctamente.",
      eliminados: resultado.affectedRows || 0,
    });
  } catch (error) {
    console.error("Error al limpiar historial:", error);

    return res.status(500).json({
      mensaje: "No se pudo limpiar el historial.",
    });
  }
};
