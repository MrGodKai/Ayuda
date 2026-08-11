const { Readable } = require("stream");
const pool = require("../config/db");
const { urlAbsoluta } = require("../utils/urls");

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
            urlAbsoluta(cancion.portada_url),
          audioUrl:
            urlAbsoluta(cancion.audio_url),
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

/**
 * Transmite el audio de una canción. Si el archivo vive en un
 * origen externo (por ejemplo archive.org), lo pide desde el
 * backend y lo retransmite tal cual: algunos CDN externos devuelven
 * respuestas parciales (206) sin el header Content-Range, algo que
 * los navegadores rechazan al reproducir <audio> directo contra esa
 * URL. Pedimos siempre el archivo completo acá y lo reenviamos,
 * así el navegador recibe una respuesta HTTP válida.
 */
exports.transmitirAudioCancion = async (req, res) => {
  try {
    const idCancion = Number(req.params.id);

    if (!Number.isInteger(idCancion) || idCancion <= 0) {
      return res.status(400).json({ mensaje: "ID de canción no válido." });
    }

    const [filas] = await pool.execute(
      `SELECT audio_url FROM canciones WHERE id_cancion = ? AND estado = TRUE LIMIT 1`,
      [idCancion]
    );

    if (filas.length === 0 || !filas[0].audio_url) {
      return res.status(404).json({ mensaje: "No se encontró el audio de esta canción." });
    }

    const audioUrlCrudo = filas[0].audio_url;

    // Los archivos subidos por nosotros ya están servidos correctamente
    // por express.static (sí soporta Range bien): no hace falta proxearlos.
    if (!/^https?:\/\//i.test(audioUrlCrudo)) {
      return res.redirect(urlAbsoluta(audioUrlCrudo));
    }

    const respuestaExterna = await fetch(audioUrlCrudo);

    if (!respuestaExterna.ok || !respuestaExterna.body) {
      return res.status(502).json({
        mensaje: "No se pudo obtener el audio desde el origen externo.",
      });
    }

    res.status(200);
    res.setHeader(
      "Content-Type",
      respuestaExterna.headers.get("content-type") || "audio/mpeg"
    );

    const longitud = respuestaExterna.headers.get("content-length");

    if (longitud) {
      res.setHeader("Content-Length", longitud);
    }

    res.setHeader("Cache-Control", "public, max-age=86400");

    Readable.fromWeb(respuestaExterna.body).pipe(res);
  } catch (error) {
    console.error("Error al transmitir el audio de la canción:", error);

    if (!res.headersSent) {
      res.status(500).json({ mensaje: "No se pudo transmitir el audio." });
    }
  }
};