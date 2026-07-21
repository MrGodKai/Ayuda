const pool = require("../config/db");

const datosFallback = [
  {
    id: 1,
    titulo: "Midnight City",
    artista: "M83",
    album: "Hurry Up, We're Dreaming",
    genero: "Indie",
    descripcion: "Tema emblemático del indie electrónico.",
  },
  {
    id: 2,
    titulo: "Ocean Eyes",
    artista: "Billie Eilish",
    album: "Dont Smile at Me",
    genero: "Pop",
    descripcion: "Corte dulce y minimalista con gran alcance global.",
  },
  {
    id: 3,
    titulo: "La zona",
    artista: "Nathy Peluso",
    album: "Calambre",
    genero: "Latino",
    descripcion: "Ritmo contemporáneo con fuerte presencia vocal.",
  },
  {
    id: 4,
    titulo: "The Less I Know The Better",
    artista: "Tame Impala",
    album: "Currents",
    genero: "Psychedelic",
    descripcion: "Fusión de pop y psicodelia muy reconocible.",
  },
  {
    id: 5,
    titulo: "Havana",
    artista: "Camila Cabello",
    album: "Camila",
    genero: "Latino",
    descripcion: "Éxito pop con influencias latinas.",
  },
];

function normalizarTexto(valor = "") {
  return String(valor).trim().toLowerCase();
}

function buscarFallback(termino) {
  const texto = normalizarTexto(termino);

  if (!texto) {
    return {
      query: "",
      canciones: [],
      artistas: [],
      albums: [],
      mensaje: "Escribe una palabra clave para iniciar la búsqueda.",
    };
  }

  const canciones = datosFallback.filter((item) => {
    const hayCoincidencia = [item.titulo, item.artista, item.album]
      .filter(Boolean)
      .some((campo) => normalizarTexto(campo).includes(texto));

    return hayCoincidencia;
  });

  const artistas = [...new Set(canciones.map((item) => item.artista).filter(Boolean))]
    .map((nombre) => ({ nombre }));

  const albums = [...new Set(canciones.map((item) => item.album).filter(Boolean))]
    .map((nombre) => ({ nombre }));

  return {
    query: termino,
    canciones: canciones.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      artista: item.artista,
      album: item.album || "Sin álbum",
      genero: item.genero || "Sin género",
      descripcion: item.descripcion || "Sin descripción",
    })),
    artistas,
    albums,
    mensaje:
      canciones.length > 0
        ? "Resultados encontrados."
        : "No se encontraron resultados para tu búsqueda.",
  };
}

exports.buscarContenido = async (req, res) => {
  const query = String(req.query.query || "").trim();

  if (!query) {
    return res.status(200).json({
      query: "",
      canciones: [],
      artistas: [],
      albums: [],
      mensaje: "Escribe una palabra clave para iniciar la búsqueda.",
    });
  }

  const patron = `%${query}%`;

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
         AND (
           titulo LIKE ? OR
           artista LIKE ? OR
           album LIKE ?
         )
       ORDER BY titulo ASC
       LIMIT 20`,
      [patron, patron, patron]
    );

    const [artistas] = await pool.execute(
      `SELECT DISTINCT artista AS nombre
       FROM canciones
       WHERE estado = TRUE
         AND artista LIKE ?
       ORDER BY artista ASC
       LIMIT 10`,
      [patron]
    );

    const [albums] = await pool.execute(
      `SELECT DISTINCT album AS nombre
       FROM canciones
       WHERE estado = TRUE
         AND album LIKE ?
       ORDER BY album ASC
       LIMIT 10`,
      [patron]
    );

    const respuesta = {
      query,
      canciones: canciones.map((cancion) => ({
        id: cancion.id_cancion,
        titulo: cancion.titulo,
        artista: cancion.artista,
        album: cancion.album || "Sin álbum",
        genero: cancion.genero || "Sin género",
        descripcion: cancion.descripcion || "Sin descripción",
        duracion: cancion.duracion_segundos || 0,
        audioUrl: cancion.audio_url || null,
        portada: cancion.portada_url || null,
      })),
      artistas: artistas.map((artista) => ({
        nombre: artista.nombre,
      })),
      albums: albums.map((album) => ({
        nombre: album.nombre,
      })),
      mensaje:
        canciones.length > 0 || artistas.length > 0 || albums.length > 0
          ? "Resultados encontrados."
          : "No se encontraron resultados para tu búsqueda.",
    };

    if (
      respuesta.canciones.length === 0 &&
      respuesta.artistas.length === 0 &&
      respuesta.albums.length === 0
    ) {
      return res.status(200).json({
        ...buscarFallback(query),
        fuente: "fallback",
      });
    }

    return res.status(200).json(respuesta);
  } catch (error) {
    console.error("Error en búsqueda rápida:", error);

    const respuestaFallback = buscarFallback(query);
    return res.status(200).json({
      ...respuestaFallback,
      fuente: "fallback",
    });
  }
};
