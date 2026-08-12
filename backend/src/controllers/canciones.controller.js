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
 * backend y lo retransmite tal cual, reenviando el header Range
 * cuando el navegador lo manda (para que arranque más rápido y se
 * pueda buscar dentro de la canción). Algunos CDN externos devuelven
 * respuestas parciales (206) sin el header Content-Range, algo que
 * los navegadores rechazan al reproducir <audio> directo contra esa
 * URL: en ese caso pedimos el archivo completo y lo reenviamos como
 * 200, así el navegador siempre recibe una respuesta HTTP válida.
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

    const rangoPedido = req.headers.range;

    // Timeout manual acotado SOLO a la conexión/espera de headers: si usáramos
    // AbortSignal.timeout aquí, la misma señal seguiría "viva" durante todo el
    // streaming del cuerpo (que puede tardar más de 15s en una canción real) y
    // abortaría la descarga a mitad de camino. Por eso cancelamos el timer en
    // cuanto el fetch resuelve, sea éxito o error.
    const controladorConexion = new AbortController();
    const timeoutConexion = setTimeout(() => controladorConexion.abort(), 15000);
    let respuestaExterna;

    try {
      respuestaExterna = await fetch(audioUrlCrudo, {
        headers: rangoPedido ? { Range: rangoPedido } : {},
        signal: controladorConexion.signal,
      });
    } catch (errorFetch) {
      if (errorFetch.name === "AbortError" || errorFetch.name === "TimeoutError") {
        return res.status(504).json({
          mensaje: "El origen externo tardó demasiado en responder.",
        });
      }
      throw errorFetch;
    } finally {
      clearTimeout(timeoutConexion);
    }

    if (!respuestaExterna.ok && respuestaExterna.status !== 206) {
      return res.status(502).json({
        mensaje: "No se pudo obtener el audio desde el origen externo.",
      });
    }

    if (!respuestaExterna.body) {
      return res.status(502).json({
        mensaje: "No se pudo obtener el audio desde el origen externo.",
      });
    }

    const contentRangeExterno = respuestaExterna.headers.get("content-range");

    if (respuestaExterna.status === 206 && contentRangeExterno) {
      // El origen externo sí soporta range requests correctamente: lo retransmitimos tal cual.
      res.status(206);
      res.setHeader("Content-Range", contentRangeExterno);
      res.setHeader("Accept-Ranges", "bytes");
    } else {
      // Comportamiento original: servir el archivo completo. Cubre el caso de
      // orígenes que devuelven 206 sin Content-Range (motivo por el que existe este proxy).
      res.status(200);
    }

    res.setHeader(
      "Content-Type",
      respuestaExterna.headers.get("content-type") || "audio/mpeg"
    );

    const longitud = respuestaExterna.headers.get("content-length");

    if (longitud) {
      res.setHeader("Content-Length", longitud);
    }

    res.setHeader("Cache-Control", "public, max-age=86400");

    const flujoAudio = Readable.fromWeb(respuestaExterna.body);

    // Sin este listener, un error del stream (conexión cortada a mitad de
    // transmisión, origen externo que se cae, etc.) queda sin manejar y
    // Node tira todo el proceso abajo (crashea el backend completo, no solo
    // esta descarga). Lo atrapamos acá y cerramos la respuesta prolijamente.
    flujoAudio.on("error", (errorFlujo) => {
      console.error("Error al transmitir el cuerpo del audio:", errorFlujo);

      if (!res.headersSent) {
        res.status(502).json({ mensaje: "Se interrumpió la transmisión del audio." });
      } else {
        res.destroy();
      }
    });

    flujoAudio.pipe(res);
  } catch (error) {
    console.error("Error al transmitir el audio de la canción:", error);

    if (!res.headersSent) {
      res.status(500).json({ mensaje: "No se pudo transmitir el audio." });
    }
  }
};