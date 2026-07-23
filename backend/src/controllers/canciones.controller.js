const pool = require("../config/db");

/**
 * Obtiene seis canciones activas seleccionadas
 * aleatoriamente desde MySQL.
 *
 * Por el momento se mostrarán aleatoriamente como
 * "Populares del momento".
 */
exports.obtenerCancionesPopulares = async (
  req,
  res
) => {
  try {
    const [canciones] = await pool.execute(
      `SELECT
         id_cancion,
         titulo,
         artista,
         album,
         genero,
         descripcion,
         duracion_segundos,
         portada_url,
         audio_url
       FROM canciones
       WHERE estado = TRUE
       ORDER BY RAND()
       LIMIT 6`
    );

    return res.status(200).json({
      canciones: canciones.map(
        (cancion) => ({
          id: cancion.id_cancion,
          titulo: cancion.titulo,
          artista: cancion.artista,
          album:
            cancion.album || "Sin álbum",
          genero:
            cancion.genero || "Sin género",
          descripcion:
            cancion.descripcion ||
            "Sin descripción",
          duracion:
            cancion.duracion_segundos || 0,
          portada:
            cancion.portada_url || null,
          audioUrl:
            cancion.audio_url || null,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Error al obtener canciones populares:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron obtener las canciones populares.",
    });
  }
};