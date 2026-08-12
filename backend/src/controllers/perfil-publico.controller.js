const pool = require("../config/db");
const { urlAbsoluta } = require("../utils/urls");

function formatearFecha(fecha) {
  if (!fecha) {
    return null;
  }

  const fechaObjeto = new Date(fecha);

  if (Number.isNaN(fechaObjeto.getTime())) {
    return null;
  }

  const anio = fechaObjeto.getUTCFullYear();
  const mes = String(fechaObjeto.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fechaObjeto.getUTCDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

async function calcularRelacion(idViewer, idObjetivo) {
  const [[fila]] = await pool.execute(
    `SELECT
       EXISTS(
         SELECT 1 FROM seguidores_usuarios
         WHERE id_usuario_seguidor = ? AND id_usuario_seguido = ?
       ) AS lo_sigo,
       EXISTS(
         SELECT 1 FROM seguidores_usuarios
         WHERE id_usuario_seguidor = ? AND id_usuario_seguido = ?
       ) AS me_sigue`,
    [idViewer, idObjetivo, idObjetivo, idViewer]
  );

  const loSigo = Boolean(fila.lo_sigo);
  const meSigue = Boolean(fila.me_sigue);

  return {
    loSigo,
    meSigue,
    esMutuo: loSigo && meSigue,
    puedeSeguir: true,
    puedeChatear: loSigo && meSigue,
  };
}

async function contarSeguidores(idUsuario) {
  const [[fila]] = await pool.execute(
    `SELECT
       (SELECT COUNT(*) FROM seguidores_usuarios WHERE id_usuario_seguido = ?) AS seguidores,
       (SELECT COUNT(*) FROM seguidores_usuarios WHERE id_usuario_seguidor = ?) AS siguiendo`,
    [idUsuario, idUsuario]
  );

  return {
    seguidores: fila.seguidores,
    siguiendo: fila.siguiendo,
  };
}

async function obtenerConexionesComunes(idViewer, idObjetivo) {
  const [muestra] = await pool.execute(
    `SELECT u.id_usuario, u.nombre, u.foto_perfil
     FROM seguidores_usuarios mio
     INNER JOIN seguidores_usuarios suyo
       ON suyo.id_usuario_seguidor = mio.id_usuario_seguido
     INNER JOIN usuarios u
       ON u.id_usuario = mio.id_usuario_seguido
     WHERE mio.id_usuario_seguidor = ?
       AND suyo.id_usuario_seguido = ?
       AND u.estado = TRUE
       AND u.id_usuario <> ?
     ORDER BY u.nombre ASC
     LIMIT 3`,
    [idViewer, idObjetivo, idObjetivo]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM seguidores_usuarios mio
     INNER JOIN seguidores_usuarios suyo
       ON suyo.id_usuario_seguidor = mio.id_usuario_seguido
     INNER JOIN usuarios u
       ON u.id_usuario = mio.id_usuario_seguido
     WHERE mio.id_usuario_seguidor = ?
       AND suyo.id_usuario_seguido = ?
       AND u.estado = TRUE
       AND u.id_usuario <> ?`,
    [idViewer, idObjetivo, idObjetivo]
  );

  return {
    total,
    muestra: muestra.map((fila) => ({
      id: fila.id_usuario,
      nombre: fila.nombre,
      fotoUrl: urlAbsoluta(fila.foto_perfil),
    })),
  };
}

async function obtenerContenidoUsuario(idUsuario) {
  const [historial] = await pool.execute(
    `SELECT titulo_cancion, artista_cancion, album_cancion, MAX(reproducido_en) AS ultima_vez
     FROM historial_reproducciones
     WHERE id_usuario = ?
     GROUP BY titulo_cancion, artista_cancion, album_cancion
     ORDER BY ultima_vez DESC
     LIMIT 10`,
    [idUsuario]
  );

  const [favoritos] = await pool.execute(
    `SELECT titulo_cancion, artista_cancion, album_cancion, creado_en
     FROM canciones_favoritas
     WHERE id_usuario = ?
     ORDER BY creado_en DESC
     LIMIT 10`,
    [idUsuario]
  );

  const [artistasFavoritos] = await pool.execute(
    `SELECT artista_cancion AS artista, COUNT(*) AS reproducciones
     FROM historial_reproducciones
     WHERE id_usuario = ?
     GROUP BY artista_cancion
     ORDER BY reproducciones DESC
     LIMIT 5`,
    [idUsuario]
  );

  return {
    historial: historial.map((fila) => ({
      titulo: fila.titulo_cancion,
      artista: fila.artista_cancion,
      album: fila.album_cancion,
      ultimaVez: fila.ultima_vez,
    })),
    favoritos: favoritos.map((fila) => ({
      titulo: fila.titulo_cancion,
      artista: fila.artista_cancion,
      album: fila.album_cancion,
    })),
    artistasFavoritos: artistasFavoritos.map((fila) => ({
      artista: fila.artista,
      reproducciones: fila.reproducciones,
    })),
  };
}

exports.obtenerPerfilPublicoUsuario = async (req, res) => {
  try {
    const idViewer = req.usuario.id;
    const idObjetivo = Number(req.params.idUsuario);

    if (!Number.isInteger(idObjetivo) || idObjetivo <= 0) {
      return res.status(400).json({ mensaje: "ID de usuario no válido." });
    }

    const [usuarios] = await pool.execute(
      `SELECT id_usuario, nombre, correo, foto_perfil, portada_url, biografia, perfil_privado, creado_en
       FROM usuarios
       WHERE id_usuario = ? AND estado = TRUE
       LIMIT 1`,
      [idObjetivo]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }

    const objetivo = usuarios[0];
    const esPropio = idObjetivo === idViewer;

    const relacion = esPropio
      ? { loSigo: false, meSigue: false, esMutuo: false, puedeSeguir: false, puedeChatear: false }
      : await calcularRelacion(idViewer, idObjetivo);

    const estadisticas = await contarSeguidores(idObjetivo);

    const conexionesComunes = esPropio
      ? { total: 0, muestra: [] }
      : await obtenerConexionesComunes(idViewer, idObjetivo);

    const esPrivado = Boolean(objetivo.perfil_privado);
    const puedeVerActividad = esPropio || !esPrivado || relacion.esMutuo;

    const contenido = puedeVerActividad
      ? await obtenerContenidoUsuario(idObjetivo)
      : { historial: [], favoritos: [], artistasFavoritos: [] };

    return res.status(200).json({
      perfil: {
        tipo: "usuario",
        idUsuario: objetivo.id_usuario,
        idArtista: null,
        nombre: objetivo.nombre,
        correo: objetivo.correo,
        fotoUrl: urlAbsoluta(objetivo.foto_perfil),
        portadaUrl: urlAbsoluta(objetivo.portada_url),
        biografia: objetivo.biografia || "",
        fechaDebut: null,
        fechaUnion: objetivo.creado_en,
        esPropio,
        privado: esPrivado,
        puedeVerActividad,
        generos: [],
        estadisticas,
        relacion,
        conexionesComunes,
        contenido,
      },
    });
  } catch (error) {
    console.error("Error al obtener perfil público de usuario:", error);

    return res.status(500).json({
      mensaje: "No se pudo obtener el perfil.",
    });
  }
};

exports.obtenerPerfilPublicoArtista = async (req, res) => {
  try {
    const idViewer = req.usuario.id;
    const identificador = String(req.params.identificador || "").trim();

    if (!identificador) {
      return res.status(400).json({ mensaje: "Debe indicar el artista." });
    }

    const esNumerico = /^\d+$/.test(identificador);

    const [artistas] = await pool.execute(
      `SELECT
         a.id_artista, a.id_usuario, a.nombre, a.biografia, a.foto_url, a.portada_url,
         a.generos, a.fecha_debut, a.creado_en,
         u.correo, u.creado_en AS usuario_creado_en,
         u.foto_perfil AS usuario_foto_perfil,
         u.portada_url AS usuario_portada_url,
         u.biografia AS usuario_biografia
       FROM artistas a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       WHERE a.estado = TRUE
         AND ${esNumerico ? "a.id_artista = ?" : "a.nombre = ?"}
       LIMIT 1`,
      [esNumerico ? Number(identificador) : identificador]
    );

    if (artistas.length === 0) {
      return res.status(404).json({ mensaje: "No encontramos este artista." });
    }

    const artista = artistas[0];
    const idUsuarioArtista = artista.id_usuario;
    const esPropio = idUsuarioArtista !== null && idUsuarioArtista === idViewer;

    let relacion = { loSigo: false, meSigue: false, esMutuo: false, puedeSeguir: false, puedeChatear: false };
    let estadisticas = { seguidores: 0, siguiendo: 0 };
    let conexionesComunes = { total: 0, muestra: [] };

    if (idUsuarioArtista !== null) {
      estadisticas = await contarSeguidores(idUsuarioArtista);

      if (!esPropio) {
        relacion = await calcularRelacion(idViewer, idUsuarioArtista);
        conexionesComunes = await obtenerConexionesComunes(idViewer, idUsuarioArtista);
      }
    }

    const [cancionesRows] = await pool.execute(
      `SELECT id_cancion, titulo, album, genero, duracion_segundos, portada_url, audio_url, creado_en
       FROM canciones
       WHERE estado = TRUE AND id_artista = ?
       ORDER BY creado_en DESC, titulo ASC`,
      [artista.id_artista]
    );

    const canciones = cancionesRows.map((fila) => ({
      id: fila.id_cancion,
      titulo: fila.titulo,
      album: fila.album || null,
      genero: fila.genero || null,
      duracionSegundos: fila.duracion_segundos || null,
      portadaUrl: urlAbsoluta(fila.portada_url),
      audioUrl: urlAbsoluta(fila.audio_url),
    }));

    const albumsMap = new Map();

    cancionesRows.forEach((fila) => {
      if (!fila.album) {
        return;
      }

      if (!albumsMap.has(fila.album)) {
        albumsMap.set(fila.album, {
          nombre: fila.album,
          totalCanciones: 0,
          portadaUrl: null,
        });
      }

      const album = albumsMap.get(fila.album);
      album.totalCanciones += 1;

      if (!album.portadaUrl && fila.portada_url) {
        album.portadaUrl = urlAbsoluta(fila.portada_url);
      }
    });

    return res.status(200).json({
      perfil: {
        tipo: "artista",
        idUsuario: idUsuarioArtista,
        idArtista: artista.id_artista,
        nombre: artista.nombre,
        correo: artista.correo || null,
        fotoUrl: urlAbsoluta(artista.usuario_foto_perfil || artista.foto_url),
        portadaUrl: urlAbsoluta(artista.usuario_portada_url || artista.portada_url),
        biografia: artista.usuario_biografia || artista.biografia || "",
        fechaDebut: formatearFecha(artista.fecha_debut),
        fechaUnion: artista.usuario_creado_en || artista.creado_en,
        esPropio,
        privado: false,
        puedeVerActividad: true,
        generos: (artista.generos || "")
          .split(",")
          .map((genero) => genero.trim())
          .filter(Boolean),
        estadisticas,
        relacion,
        conexionesComunes,
        contenido: {
          canciones,
          albums: [...albumsMap.values()],
        },
      },
    });
  } catch (error) {
    console.error("Error al obtener perfil público de artista:", error);

    return res.status(500).json({
      mensaje: "No se pudo obtener el perfil del artista.",
    });
  }
};
