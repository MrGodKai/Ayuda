const pool = require("../config/db");

function mapearUsuarioRelacion(fila) {
  return {
    id: fila.id_usuario,
    nombre: fila.nombre,
    correo: fila.correo,
    fotoPerfil: fila.foto_perfil,
    desde: fila.creado_en || null,
  };
}

exports.obtenerRedSeguidores = async (req, res) => {
  try {
    const idUsuarioActual = req.usuario.id;

    const [siguiendo] = await pool.execute(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.correo,
         u.foto_perfil,
         s.creado_en
       FROM seguidores_usuarios s
       INNER JOIN usuarios u
         ON u.id_usuario = s.id_usuario_seguido
       WHERE s.id_usuario_seguidor = ?
         AND u.estado = TRUE
       ORDER BY s.creado_en DESC, s.id_seguimiento DESC`,
      [idUsuarioActual]
    );

    const [seguidores] = await pool.execute(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.correo,
         u.foto_perfil,
         s.creado_en
       FROM seguidores_usuarios s
       INNER JOIN usuarios u
         ON u.id_usuario = s.id_usuario_seguidor
       WHERE s.id_usuario_seguido = ?
         AND u.estado = TRUE
       ORDER BY s.creado_en DESC, s.id_seguimiento DESC`,
      [idUsuarioActual]
    );

    return res.status(200).json({
      siguiendo: siguiendo.map(mapearUsuarioRelacion),
      seguidores: seguidores.map(mapearUsuarioRelacion),
      estadisticas: {
        siguiendo: siguiendo.length,
        seguidores: seguidores.length,
      },
    });
  } catch (error) {
    console.error("Error al obtener red de seguidores:", error);

    return res.status(500).json({
      mensaje: "No se pudo obtener tu red de seguidores.",
    });
  }
};

exports.seguirUsuario = async (req, res) => {
  try {
    const idSeguidor = req.usuario.id;
    const idSeguido = Number(req.body.idUsuario);

    if (!Number.isInteger(idSeguido) || idSeguido <= 0) {
      return res.status(400).json({
        mensaje: "Debe indicar un usuario valido para seguir.",
      });
    }

    if (idSeguido === idSeguidor) {
      return res.status(400).json({
        mensaje: "No puedes seguirte a ti mismo.",
      });
    }

    const [usuarios] = await pool.execute(
      `SELECT id_usuario
       FROM usuarios
       WHERE id_usuario = ?
         AND estado = TRUE
       LIMIT 1`,
      [idSeguido]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensaje: "El usuario que quieres seguir no existe o esta inactivo.",
      });
    }

    const [existente] = await pool.execute(
      `SELECT id_seguimiento
       FROM seguidores_usuarios
       WHERE id_usuario_seguidor = ?
         AND id_usuario_seguido = ?
       LIMIT 1`,
      [idSeguidor, idSeguido]
    );

    if (existente.length > 0) {
      return res.status(409).json({
        mensaje: "Ya sigues a este usuario.",
      });
    }

    await pool.execute(
      `INSERT INTO seguidores_usuarios
       (
         id_usuario_seguidor,
         id_usuario_seguido
       )
       VALUES (?, ?)`,
      [idSeguidor, idSeguido]
    );

    return res.status(201).json({
      mensaje: "Ahora sigues a este usuario.",
    });
  } catch (error) {
    console.error("Error al seguir usuario:", error);

    return res.status(500).json({
      mensaje: "No se pudo completar la accion de seguir.",
    });
  }
};

exports.dejarDeSeguirUsuario = async (req, res) => {
  try {
    const idSeguidor = req.usuario.id;
    const idSeguido = Number(req.params.idUsuario);

    if (!Number.isInteger(idSeguido) || idSeguido <= 0) {
      return res.status(400).json({
        mensaje: "El identificador del usuario no es valido.",
      });
    }

    if (idSeguido === idSeguidor) {
      return res.status(400).json({
        mensaje: "No puedes dejar de seguirte a ti mismo.",
      });
    }

    const [resultado] = await pool.execute(
      `DELETE FROM seguidores_usuarios
       WHERE id_usuario_seguidor = ?
         AND id_usuario_seguido = ?`,
      [idSeguidor, idSeguido]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "No seguias a este usuario.",
      });
    }

    return res.status(200).json({
      mensaje: "Has dejado de seguir a este usuario.",
    });
  } catch (error) {
    console.error("Error al dejar de seguir usuario:", error);

    return res.status(500).json({
      mensaje: "No se pudo completar la accion de dejar de seguir.",
    });
  }
};

exports.buscarUsuariosAmistad = async (req, res) => {
  try {
    const idUsuarioActual = req.usuario.id;
    const termino = String(req.query.query || "").trim();

    if (!termino) {
      return res.status(200).json({
        usuarios: [],
      });
    }

    const terminoLike = `%${termino}%`;

    const [filas] = await pool.execute(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.correo,
         u.foto_perfil,
         EXISTS(
           SELECT 1
           FROM seguidores_usuarios s1
           WHERE s1.id_usuario_seguidor = ?
             AND s1.id_usuario_seguido = u.id_usuario
         ) AS ya_lo_sigues,
         EXISTS(
           SELECT 1
           FROM seguidores_usuarios s2
           WHERE s2.id_usuario_seguidor = u.id_usuario
             AND s2.id_usuario_seguido = ?
         ) AS te_sigue
       FROM usuarios u
       WHERE u.estado = TRUE
         AND u.id_usuario <> ?
         AND (
           u.nombre LIKE ?
           OR u.correo LIKE ?
         )
       ORDER BY ya_lo_sigues DESC, te_sigue DESC, u.nombre ASC
       LIMIT 20`,
      [
        idUsuarioActual,
        idUsuarioActual,
        idUsuarioActual,
        terminoLike,
        terminoLike,
      ]
    );

    return res.status(200).json({
      usuarios: filas.map((fila) => ({
        id: fila.id_usuario,
        nombre: fila.nombre,
        correo: fila.correo,
        fotoPerfil: fila.foto_perfil,
        yaLoSigues: Boolean(fila.ya_lo_sigues),
        teSigue: Boolean(fila.te_sigue),
      })),
    });
  } catch (error) {
    console.error("Error al buscar usuarios para seguir:", error);

    return res.status(500).json({
      mensaje: "No se pudieron buscar usuarios en este momento.",
    });
  }
};

exports.obtenerPerfilAmigo = async (req, res) => {
  try {
    const idSolicitante = req.usuario.id;
    const idObjetivo = Number(req.params.idUsuario);

    if (!Number.isInteger(idObjetivo) || idObjetivo <= 0) {
      return res.status(400).json({ mensaje: "ID de usuario no válido." });
    }

    if (idObjetivo === idSolicitante) {
      return res.status(400).json({ mensaje: "No puedes ver tu propio perfil de amigo aquí." });
    }

    // Verificar que el usuario objetivo existe
    const [usuarios] = await pool.execute(
      `SELECT id_usuario, nombre, correo, foto_perfil, perfil_privado
       FROM usuarios
       WHERE id_usuario = ? AND estado = TRUE
       LIMIT 1`,
      [idObjetivo]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const objetivo = usuarios[0];

    // Verificar que existe alguna relación (A sigue a B o B sigue a A)
    const [[{ yo_sigo }]] = await pool.execute(
      `SELECT EXISTS(
         SELECT 1 FROM seguidores_usuarios
         WHERE id_usuario_seguidor = ? AND id_usuario_seguido = ?
       ) AS yo_sigo`,
      [idSolicitante, idObjetivo]
    );

    const [[{ me_sigue }]] = await pool.execute(
      `SELECT EXISTS(
         SELECT 1 FROM seguidores_usuarios
         WHERE id_usuario_seguidor = ? AND id_usuario_seguido = ?
       ) AS me_sigue`,
      [idObjetivo, idSolicitante]
    );

    const hayRelacion = Boolean(yo_sigo) || Boolean(me_sigue);
    const esMutuo = Boolean(yo_sigo) && Boolean(me_sigue);

    if (!hayRelacion) {
      return res.status(403).json({
        mensaje: "Solo puedes ver el perfil de usuarios con los que tienes relación.",
      });
    }

    const esPrivado = Boolean(objetivo.perfil_privado);

    // Perfil privado: solo mutuo puede ver la actividad
    if (esPrivado && !esMutuo) {
      return res.status(200).json({
        usuario: {
          id: objetivo.id_usuario,
          nombre: objetivo.nombre,
          fotoPerfil: objetivo.foto_perfil,
        },
        privado: true,
        mutuo: false,
        historial: [],
        favoritos: [],
        artistasFavoritos: [],
      });
    }

    // Obtener historial reciente (últimas 10 canciones únicas)
    const [historial] = await pool.execute(
      `SELECT titulo_cancion, artista_cancion, album_cancion, MAX(reproducido_en) AS ultima_vez
       FROM historial_reproducciones
       WHERE id_usuario = ?
       GROUP BY titulo_cancion, artista_cancion, album_cancion
       ORDER BY ultima_vez DESC
       LIMIT 10`,
      [idObjetivo]
    );

    // Obtener favoritos (últimos 10)
    const [favoritos] = await pool.execute(
      `SELECT titulo_cancion, artista_cancion, album_cancion, creado_en
       FROM canciones_favoritas
       WHERE id_usuario = ?
       ORDER BY creado_en DESC
       LIMIT 10`,
      [idObjetivo]
    );

    // Derivar artistas favoritos (top 5 por frecuencia en historial)
    const [artistasFavoritos] = await pool.execute(
      `SELECT artista_cancion AS artista, COUNT(*) AS reproducciones
       FROM historial_reproducciones
       WHERE id_usuario = ?
       GROUP BY artista_cancion
       ORDER BY reproducciones DESC
       LIMIT 5`,
      [idObjetivo]
    );

    return res.status(200).json({
      usuario: {
        id: objetivo.id_usuario,
        nombre: objetivo.nombre,
        fotoPerfil: objetivo.foto_perfil,
      },
      privado: false,
      mutuo: esMutuo,
      historial: historial.map((h) => ({
        titulo: h.titulo_cancion,
        artista: h.artista_cancion,
        album: h.album_cancion,
        ultimaVez: h.ultima_vez,
      })),
      favoritos: favoritos.map((f) => ({
        titulo: f.titulo_cancion,
        artista: f.artista_cancion,
        album: f.album_cancion,
      })),
      artistasFavoritos: artistasFavoritos.map((a) => ({
        artista: a.artista,
        reproducciones: a.reproducciones,
      })),
    });
  } catch (error) {
    console.error("Error al obtener perfil de amigo:", error);
    return res.status(500).json({ mensaje: "No se pudo obtener el perfil." });
  }
};
