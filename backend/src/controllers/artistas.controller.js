const pool = require("../config/db");

const artistasFallback = [
  {
    id: 1,
    nombre: "Artista-XA-12",
    biografia: "Perfil público generado para un artista ficticio dentro de iStream.",
    foto: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80",
    generos: ["Synthwave", "Indie"],
    albums: ["Álbum-Zeta-03"],
    canciones: ["Tema-412", "Tema-815"],
  },
  {
    id: 2,
    nombre: "Artista-RB-07",
    biografia: "Perfil público generado con datos de ejemplo y nombres aleatorios para pruebas de UI.",
    foto: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
    generos: ["Pop", "Electrónica"],
    albums: ["Álbum-Navio-11"],
    canciones: ["Tema-931", "Tema-230"],
  },
  {
    id: 3,
    nombre: "Artista-LM-44",
    biografia: "Artista ficticio con repertorio aleatorio para demostrar la navegación de perfil público.",
    foto: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80",
    generos: ["Latino", "Alternativo"],
    albums: ["Álbum-Onda-17"],
    canciones: ["Tema-650", "Tema-114"],
  },
];

function mapearArtista(artista) {
  return {
    id: artista.id_cancion || artista.id,
    nombre: artista.artista,
    biografia: artista.biografia || "Perfil público ficticio generado para esta plataforma.",
    foto: artista.foto || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80",
    generos: artista.generos || [artista.genero || "Sin género"],
    albums: artista.albums || [artista.album || "Álbum sin título"],
    canciones: artista.canciones || [artista.titulo || "Tema sin título"],
  };
}

exports.obtenerArtistas = async (req, res) => {
  try {
    const [artistasRows] = await pool.execute(
      `SELECT
         a.id_artista,
         a.nombre,
         a.biografia,
         a.foto_url,
         a.portada_url,
         a.generos,
         u.foto_perfil AS usuario_foto_perfil,
         u.portada_url AS usuario_portada_url
       FROM artistas a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       WHERE a.estado = TRUE
       ORDER BY a.nombre ASC
       LIMIT 20`
    );

    if (artistasRows.length === 0) {
      return res.status(200).json({
        artistas: artistasFallback,
        mensaje: "Se están mostrando artistas de ejemplo generados de forma local.",
      });
    }

    const artistasConDetalle = await Promise.all(
      artistasRows.map(async (artista) => {
        const [cancionesRows] = await pool.execute(
          `SELECT
             titulo,
             album,
             genero
           FROM canciones
           WHERE estado = TRUE
             AND id_artista = ?
           ORDER BY titulo ASC`,
          [artista.id_artista]
        );

        return {
          id: artista.id_artista,
          nombre: artista.nombre,
          biografia: artista.biografia || `Perfil público del artista ${artista.nombre}.`,
          foto: artista.usuario_foto_perfil || artista.foto_url || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80",
          portada: artista.usuario_portada_url || artista.portada_url || null,
          generos: (artista.generos || "Sin género")
            .split(",")
            .map((genero) => genero.trim())
            .filter(Boolean),
          albums: [...new Set(cancionesRows.map((item) => item.album).filter(Boolean))],
          canciones: [...new Set(cancionesRows.map((item) => item.titulo).filter(Boolean))],
        };
      })
    );

    return res.status(200).json({
      artistas: artistasConDetalle,
      mensaje: "Listado obtenido desde SQL.",
    });
  } catch (error) {
    console.error("Error al obtener artistas:", error);

    return res.status(200).json({
      artistas: artistasFallback,
      mensaje: "Se devolvieron artistas de ejemplo por falta de conexión a datos.",
    });
  }
};

exports.obtenerPerfilArtista = async (req, res) => {
  const nombre = String(req.params.nombre || "").trim();

  if (!nombre) {
    return res.status(400).json({ mensaje: "Debe indicar el nombre del artista." });
  }

  try {
    const [artistaRows] = await pool.execute(
      `SELECT
         a.id_artista,
         a.nombre,
         a.biografia,
         a.foto_url,
         a.portada_url,
         a.generos,
         u.foto_perfil AS usuario_foto_perfil,
         u.portada_url AS usuario_portada_url
       FROM artistas a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       WHERE a.estado = TRUE
         AND a.nombre = ?
       LIMIT 1`,
      [nombre]
    );

    if (artistaRows.length === 0) {
      const artistaFallback = artistasFallback.find((item) => item.nombre === nombre);

      if (!artistaFallback) {
        return res.status(404).json({ mensaje: "No se encontró el perfil solicitado." });
      }

      return res.status(200).json({ artista: artistaFallback });
    }

    const artista = artistaRows[0];
    const [cancionesRows] = await pool.execute(
      `SELECT
         titulo,
         album,
         genero
       FROM canciones
       WHERE estado = TRUE
         AND id_artista = ?
       ORDER BY titulo ASC`,
      [artista.id_artista]
    );

    return res.status(200).json({
      artista: {
        id: artista.id_artista,
        nombre: artista.nombre,
        biografia: artista.biografia || `Perfil público del artista ${artista.nombre}.`,
        foto: artista.usuario_foto_perfil || artista.foto_url || "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80",
        portada: artista.usuario_portada_url || artista.portada_url || null,
        generos: (artista.generos || "Sin género")
          .split(",")
          .map((genero) => genero.trim())
          .filter(Boolean),
        albums: [...new Set(cancionesRows.map((fila) => fila.album).filter(Boolean))],
        canciones: [...new Set(cancionesRows.map((fila) => fila.titulo).filter(Boolean))],
      },
    });
  } catch (error) {
    console.error("Error al obtener perfil del artista:", error);

    const artistaFallback = artistasFallback.find((item) => item.nombre === nombre);

    return res.status(200).json({
      artista: artistaFallback || artistasFallback[0],
      mensaje: "Se devolvió un perfil de ejemplo por una incidencia en SQL.",
    });
  }
};
