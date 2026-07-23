const pool = require("../config/db");

/**
 * Obtiene seis canciones activas ordenadas por popularidad
 * según reproducciones recientes y acumuladas.
 */
exports.obtenerCancionesPopulares = async (
  req,
  res
) => {
  try {
    const [canciones] = await pool.execute(
      `SELECT
         c.id_cancion,
         c.titulo,
         c.artista,
         c.album,
         c.genero,
         c.descripcion,
         c.duracion_segundos,
         c.portada_url,
         c.audio_url,
         SUM(
           CASE
             WHEN h.reproducido_en >= (NOW() - INTERVAL 7 DAY)
             THEN 1
             ELSE 0
           END
         ) AS reproducciones_7d,
         COUNT(h.id_historial) AS reproducciones_totales,
         MAX(h.reproducido_en) AS ultima_reproduccion
       FROM canciones c
       LEFT JOIN historial_reproducciones h
         ON h.id_cancion = c.id_cancion
       WHERE c.estado = TRUE
       GROUP BY
         c.id_cancion,
         c.titulo,
         c.artista,
         c.album,
         c.genero,
         c.descripcion,
         c.duracion_segundos,
         c.portada_url,
         c.audio_url,
         c.actualizado_en
       ORDER BY
         reproducciones_7d DESC,
         reproducciones_totales DESC,
         ultima_reproduccion DESC,
         c.actualizado_en DESC
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