const pool = require("../config/db");

const LIMITE_MENSAJES_HISTORIAL = 200;
const LIMITE_CARACTERES_MENSAJE = 2000;
const MINUTOS_EN_LINEA = 2;

async function verificarMutuo(idA, idB) {
  const [[{ mutuo }]] = await pool.execute(
    `SELECT
       EXISTS(
         SELECT 1 FROM seguidores_usuarios
         WHERE id_usuario_seguidor = ? AND id_usuario_seguido = ?
       )
       AND
       EXISTS(
         SELECT 1 FROM seguidores_usuarios
         WHERE id_usuario_seguidor = ? AND id_usuario_seguido = ?
       ) AS mutuo`,
    [idA, idB, idB, idA]
  );

  return Boolean(mutuo);
}

async function obtenerUsuarioActivo(idUsuario) {
  const [usuarios] = await pool.execute(
    `SELECT
       id_usuario,
       nombre,
       foto_perfil,
       (
         ultima_actividad IS NOT NULL
         AND ultima_actividad >= (NOW() - INTERVAL ${MINUTOS_EN_LINEA} MINUTE)
       ) AS en_linea
     FROM usuarios
     WHERE id_usuario = ?
       AND estado = TRUE
     LIMIT 1`,
    [idUsuario]
  );

  return usuarios[0] || null;
}

exports.obtenerConversaciones = async (req, res) => {
  try {
    const idUsuarioActual = req.usuario.id;

    const [filas] = await pool.execute(
      `SELECT
         u.id_usuario AS id,
         u.nombre,
         u.foto_perfil,
         (
           u.ultima_actividad IS NOT NULL
           AND u.ultima_actividad >= (NOW() - INTERVAL ${MINUTOS_EN_LINEA} MINUTE)
         ) AS en_linea,
         GREATEST(s1.creado_en, s2.creado_en) AS mutuo_desde,
         (
           SELECT m.contenido FROM mensajes m
           WHERE (m.id_usuario_emisor = ? AND m.id_usuario_receptor = u.id_usuario)
              OR (m.id_usuario_emisor = u.id_usuario AND m.id_usuario_receptor = ?)
           ORDER BY m.creado_en DESC, m.id_mensaje DESC
           LIMIT 1
         ) AS ultimo_mensaje,
         (
           SELECT m.creado_en FROM mensajes m
           WHERE (m.id_usuario_emisor = ? AND m.id_usuario_receptor = u.id_usuario)
              OR (m.id_usuario_emisor = u.id_usuario AND m.id_usuario_receptor = ?)
           ORDER BY m.creado_en DESC, m.id_mensaje DESC
           LIMIT 1
         ) AS ultimo_mensaje_fecha,
         (
           SELECT m.id_usuario_emisor FROM mensajes m
           WHERE (m.id_usuario_emisor = ? AND m.id_usuario_receptor = u.id_usuario)
              OR (m.id_usuario_emisor = u.id_usuario AND m.id_usuario_receptor = ?)
           ORDER BY m.creado_en DESC, m.id_mensaje DESC
           LIMIT 1
         ) AS ultimo_mensaje_emisor,
         (
           SELECT COUNT(*) FROM mensajes m
           WHERE m.id_usuario_emisor = u.id_usuario
             AND m.id_usuario_receptor = ?
             AND m.leido_en IS NULL
         ) AS no_leidos
       FROM seguidores_usuarios s1
       INNER JOIN seguidores_usuarios s2
         ON s2.id_usuario_seguidor = s1.id_usuario_seguido
         AND s2.id_usuario_seguido = s1.id_usuario_seguidor
       INNER JOIN usuarios u
         ON u.id_usuario = s1.id_usuario_seguido
       WHERE s1.id_usuario_seguidor = ?
         AND u.estado = TRUE
       ORDER BY COALESCE(ultimo_mensaje_fecha, mutuo_desde) DESC`,
      [
        idUsuarioActual,
        idUsuarioActual,
        idUsuarioActual,
        idUsuarioActual,
        idUsuarioActual,
        idUsuarioActual,
        idUsuarioActual,
        idUsuarioActual,
      ]
    );

    return res.status(200).json({
      conversaciones: filas.map((fila) => ({
        idUsuario: fila.id,
        nombre: fila.nombre,
        fotoPerfil: fila.foto_perfil,
        enLinea: Boolean(fila.en_linea),
        ultimoMensaje: fila.ultimo_mensaje,
        ultimoMensajeFecha: fila.ultimo_mensaje_fecha,
        ultimoMensajeEsMio: fila.ultimo_mensaje_emisor === idUsuarioActual,
        noLeidos: fila.no_leidos,
        mutuoDesde: fila.mutuo_desde,
      })),
    });
  } catch (error) {
    console.error("Error al obtener conversaciones:", error);

    return res.status(500).json({
      mensaje: "No se pudieron obtener tus conversaciones.",
    });
  }
};

exports.obtenerMensajesConContacto = async (req, res) => {
  try {
    const idUsuarioActual = req.usuario.id;
    const idContacto = Number(req.params.idContacto);

    if (!Number.isInteger(idContacto) || idContacto <= 0) {
      return res.status(400).json({
        mensaje: "El identificador del contacto no es válido.",
      });
    }

    if (idContacto === idUsuarioActual) {
      return res.status(400).json({
        mensaje: "No puedes chatear contigo mismo.",
      });
    }

    const contacto = await obtenerUsuarioActivo(idContacto);

    if (!contacto) {
      return res.status(404).json({
        mensaje: "El usuario no existe o está inactivo.",
      });
    }

    const esMutuo = await verificarMutuo(idUsuarioActual, idContacto);

    if (!esMutuo) {
      return res.status(403).json({
        mensaje: "Ya no tienes una conversación activa con este usuario.",
      });
    }

    const [mensajes] = await pool.execute(
      `SELECT
         m.id_mensaje, m.id_usuario_emisor, m.id_usuario_receptor,
         m.contenido, m.tipo, m.creado_en,
         c.id_cancion, c.titulo AS cancion_titulo, c.artista AS cancion_artista,
         c.album AS cancion_album, c.portada_url AS cancion_portada,
         c.audio_url AS cancion_audio_url
       FROM mensajes m
       LEFT JOIN canciones c ON c.id_cancion = m.id_cancion
       WHERE (m.id_usuario_emisor = ? AND m.id_usuario_receptor = ?)
          OR (m.id_usuario_emisor = ? AND m.id_usuario_receptor = ?)
       ORDER BY m.creado_en ASC, m.id_mensaje ASC
       LIMIT ${LIMITE_MENSAJES_HISTORIAL}`,
      [idUsuarioActual, idContacto, idContacto, idUsuarioActual]
    );

    await pool.execute(
      `UPDATE mensajes
       SET leido_en = CURRENT_TIMESTAMP
       WHERE id_usuario_emisor = ?
         AND id_usuario_receptor = ?
         AND leido_en IS NULL`,
      [idContacto, idUsuarioActual]
    );

    return res.status(200).json({
      contacto: {
        id: contacto.id_usuario,
        nombre: contacto.nombre,
        fotoPerfil: contacto.foto_perfil,
        enLinea: Boolean(contacto.en_linea),
      },
      mutuo: true,
      mensajes: mensajes.map((m) => ({
        id: m.id_mensaje,
        idEmisor: m.id_usuario_emisor,
        idReceptor: m.id_usuario_receptor,
        contenido: m.contenido,
        tipo: m.tipo,
        creadoEn: m.creado_en,
        propio: m.id_usuario_emisor === idUsuarioActual,
        cancion:
          m.tipo === "cancion" && m.id_cancion
            ? {
                id: m.id_cancion,
                titulo: m.cancion_titulo,
                artista: m.cancion_artista,
                album: m.cancion_album,
                portada: m.cancion_portada,
                audioUrl: m.cancion_audio_url,
              }
            : null,
      })),
    });
  } catch (error) {
    console.error("Error al obtener mensajes:", error);

    return res.status(500).json({
      mensaje: "No se pudo obtener el historial de mensajes.",
    });
  }
};

exports.enviarMensaje = async (req, res) => {
  try {
    const idUsuarioActual = req.usuario.id;
    const idContacto = Number(req.params.idContacto);
    const contenido = String(req.body.contenido || "").trim();

    if (!Number.isInteger(idContacto) || idContacto <= 0) {
      return res.status(400).json({
        mensaje: "El identificador del contacto no es válido.",
      });
    }

    if (idContacto === idUsuarioActual) {
      return res.status(400).json({
        mensaje: "No puedes enviarte mensajes a ti mismo.",
      });
    }

    if (!contenido) {
      return res.status(400).json({
        mensaje: "El mensaje no puede estar vacío.",
      });
    }

    if (contenido.length > LIMITE_CARACTERES_MENSAJE) {
      return res.status(400).json({
        mensaje: `El mensaje no puede superar ${LIMITE_CARACTERES_MENSAJE} caracteres.`,
      });
    }

    const contacto = await obtenerUsuarioActivo(idContacto);

    if (!contacto) {
      return res.status(404).json({
        mensaje: "El usuario no existe o está inactivo.",
      });
    }

    const esMutuo = await verificarMutuo(idUsuarioActual, idContacto);

    if (!esMutuo) {
      return res.status(403).json({
        mensaje: "Ya no tienes una conversación activa con este usuario.",
      });
    }

    const [resultado] = await pool.execute(
      `INSERT INTO mensajes
       (id_usuario_emisor, id_usuario_receptor, contenido)
       VALUES (?, ?, ?)`,
      [idUsuarioActual, idContacto, contenido]
    );

    const [filas] = await pool.execute(
      `SELECT id_mensaje, id_usuario_emisor, id_usuario_receptor, contenido, creado_en
       FROM mensajes
       WHERE id_mensaje = ?
       LIMIT 1`,
      [resultado.insertId]
    );

    const mensajeCreado = filas[0];

    return res.status(201).json({
      mensaje: {
        id: mensajeCreado.id_mensaje,
        idEmisor: mensajeCreado.id_usuario_emisor,
        idReceptor: mensajeCreado.id_usuario_receptor,
        contenido: mensajeCreado.contenido,
        tipo: "texto",
        creadoEn: mensajeCreado.creado_en,
        propio: true,
        cancion: null,
      },
    });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);

    return res.status(500).json({
      mensaje: "No se pudo enviar el mensaje.",
    });
  }
};

exports.compartirCancion = async (req, res) => {
  try {
    const idUsuarioActual = req.usuario.id;
    const idContacto = Number(req.params.idContacto);
    const idCancion = Number(req.body.idCancion);

    if (!Number.isInteger(idContacto) || idContacto <= 0) {
      return res.status(400).json({
        mensaje: "El identificador del contacto no es válido.",
      });
    }

    if (idContacto === idUsuarioActual) {
      return res.status(400).json({
        mensaje: "No puedes enviarte canciones a ti mismo.",
      });
    }

    if (!Number.isInteger(idCancion) || idCancion <= 0) {
      return res.status(400).json({
        mensaje: "Debe indicar una canción válida para compartir.",
      });
    }

    const contacto = await obtenerUsuarioActivo(idContacto);

    if (!contacto) {
      return res.status(404).json({
        mensaje: "El usuario no existe o está inactivo.",
      });
    }

    const esMutuo = await verificarMutuo(idUsuarioActual, idContacto);

    if (!esMutuo) {
      return res.status(403).json({
        mensaje: "Ya no tienes una conversación activa con este usuario.",
      });
    }

    const [canciones] = await pool.execute(
      `SELECT id_cancion, titulo, artista, album, portada_url, audio_url
       FROM canciones
       WHERE id_cancion = ?
         AND estado = TRUE
       LIMIT 1`,
      [idCancion]
    );

    if (canciones.length === 0) {
      return res.status(404).json({
        mensaje: "La canción que intentas compartir no existe.",
      });
    }

    const cancion = canciones[0];
    const contenido = `🎵 ${cancion.titulo}`.slice(0, LIMITE_CARACTERES_MENSAJE);

    const [resultado] = await pool.execute(
      `INSERT INTO mensajes
       (id_usuario_emisor, id_usuario_receptor, contenido, tipo, id_cancion)
       VALUES (?, ?, ?, 'cancion', ?)`,
      [idUsuarioActual, idContacto, contenido, cancion.id_cancion]
    );

    const [filas] = await pool.execute(
      `SELECT creado_en FROM mensajes WHERE id_mensaje = ? LIMIT 1`,
      [resultado.insertId]
    );

    return res.status(201).json({
      mensaje: {
        id: resultado.insertId,
        idEmisor: idUsuarioActual,
        idReceptor: idContacto,
        contenido,
        tipo: "cancion",
        creadoEn: filas[0]?.creado_en,
        propio: true,
        cancion: {
          id: cancion.id_cancion,
          titulo: cancion.titulo,
          artista: cancion.artista,
          album: cancion.album,
          portada: cancion.portada_url,
          audioUrl: cancion.audio_url,
        },
      },
    });
  } catch (error) {
    console.error("Error al compartir canción:", error);

    return res.status(500).json({
      mensaje: "No se pudo compartir la canción.",
    });
  }
};
