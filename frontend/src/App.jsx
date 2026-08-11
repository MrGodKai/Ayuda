import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import Login from "./components/Login";
import PerfilArtista from "./components/PerfilArtista";
import GestionCanciones from "./components/GestionCanciones";
import Social from "./components/Social";
import PerfilPublico from "./components/PerfilPublico";
import RecortarImagenModal from "./components/RecortarImagenModal";
import { CONFIG_RECORTE } from "./utils/configRecorte";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const INTERVALO_ACTUALIZACION_POPULARES_MS = 60 * 1000;
const CONTRASENA_SEGURA_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,72}$/;
const AUDIO_SAMPLES = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
];

const FOTO_ARTISTA_BLANCA =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-hidden="true"><rect width="120" height="120" rx="24" fill="#ffffff"/><circle cx="60" cy="50" r="18" fill="#f2f2f2" stroke="#d9d9d9" stroke-width="3"/><path d="M30 96c6-18 21-26 30-26s24 8 30 26" fill="#f2f2f2" stroke="#d9d9d9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  );

const PLAYER_PLAYLIST_MENU_ID = "player-current-song";

function obtenerUsuarioGuardado() {
  const token =
    sessionStorage.getItem("token");

  const usuarioGuardado =
    sessionStorage.getItem("usuario");

  if (!token || !usuarioGuardado) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    return null;
  }

  try {
    return JSON.parse(usuarioGuardado);
  } catch {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    return null;
  }
}

function formatearFechaHistorial(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }

  const fechaNormalizada = new Date(fecha);

  if (Number.isNaN(fechaNormalizada.getTime())) {
    return "Sin fecha";
  }

  return fechaNormalizada.toLocaleString();
}

function resolverUrlImagen(ruta) {
  if (!ruta) {
    return null;
  }

  if (/^https?:\/\//i.test(ruta) || ruta.startsWith("data:")) {
    return ruta;
  }

  return `${API_URL.replace(/\/api\/?$/, "")}${ruta}`;
}

function obtenerFotoArtista(foto) {
  return resolverUrlImagen(foto) || FOTO_ARTISTA_BLANCA;
}

function normalizarClaveTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}

function obtenerPortadaCancionDirecta(cancion) {
  const portada = String(
    cancion?.portada ||
      cancion?.portadaUrl ||
      cancion?.portada_url ||
      ""
  ).trim();

  return portada || null;
}

function obtenerPortadaCancion(cancion, fallback = {}) {
  const portadaDirecta = obtenerPortadaCancionDirecta(cancion);

  if (portadaDirecta) {
    return portadaDirecta;
  }

  const artista = normalizarClaveTexto(cancion?.artista);
  const album = normalizarClaveTexto(cancion?.album);
  const claveArtistaAlbum = artista && album ? `${artista}::${album}` : "";

  if (claveArtistaAlbum && fallback.portadaPorArtistaAlbum?.has(claveArtistaAlbum)) {
    return fallback.portadaPorArtistaAlbum.get(claveArtistaAlbum);
  }

  if (album && fallback.portadaPorAlbum?.has(album)) {
    return fallback.portadaPorAlbum.get(album);
  }

  if (artista && fallback.portadaPorArtista?.has(artista)) {
    return fallback.portadaPorArtista.get(artista);
  }

  return null;
}

function obtenerClaseCover(baseClass, cancion, resolverPortada = obtenerPortadaCancion) {
  return `${baseClass}${resolverPortada(cancion) ? " cover-with-image" : ""}`;
}

function obtenerEstiloCover(cancion, resolverPortada = obtenerPortadaCancion) {
  const portada = resolverPortada(cancion);

  if (!portada) {
    return undefined;
  }

  return {
    backgroundImage: `url("${portada}")`,
  };
}

function normalizarErrorRed(error, mensajePorDefecto) {
  const mensaje = String(error?.message || "");

  if (/Failed to fetch/i.test(mensaje)) {
    return "No se pudo conectar con el backend. Inicia el servidor backend y verifica VITE_API_URL o el proxy de Vite.";
  }

  return mensaje || mensajePorDefecto;
}

async function leerJsonSeguro(respuesta) {
  const texto = await respuesta.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    return {};
  }
}

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioGuardado);
  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [perfilForm, setPerfilForm] = useState({
    nombre: "",
    correo: "",
    ciudad: "",
    biografia: "",
  });
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState("");
  const [errorPerfil, setErrorPerfil] = useState("");
  const [recorteUsuario, setRecorteUsuario] = useState(null);
  const [subiendoFotoUsuario, setSubiendoFotoUsuario] = useState(false);
  const [subiendoPortadaUsuario, setSubiendoPortadaUsuario] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState({
    canciones: [],
    artistas: [],
    albums: [],
    mensaje: "",
  });
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [cancionesPopulares, setCancionesPopulares] = useState([]);
  const [cargandoPopulares, setCargandoPopulares] = useState(false);
  const [errorPopulares, setErrorPopulares] = useState("");
  const [cargandoArtistas, setCargandoArtistas] = useState(false);
  const [artistasCatalogo, setArtistasCatalogo] = useState([]);
  const [cancionActual, setCancionActual] = useState({
    id: 1,
    titulo: "Midnight City",
    artista: "M83",
    album: "Hurry Up, We're Dreaming",
    audioUrl: AUDIO_SAMPLES[0],
    portada: null,
  });
  const [reproduciendo, setReproduciendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [volumen, setVolumen] = useState(70);
  const [indiceCancionActual, setIndiceCancionActual] = useState(0);
  const [playlistsUsuario, setPlaylistsUsuario] = useState([]);
  const [playlistSeleccionadaId, setPlaylistSeleccionadaId] = useState(null);
  const [menuPlaylistAbierto, setMenuPlaylistAbierto] = useState(false);
  const [menuAgregarPlaylistCancionId, setMenuAgregarPlaylistCancionId] = useState(null);
  const [menuAccionesCancionId, setMenuAccionesCancionId] = useState(null);
  const [crearPlaylistAbierto, setCrearPlaylistAbierto] = useState(false);
  const [nombreNuevaPlaylist, setNombreNuevaPlaylist] = useState("");
  const [mensajeReproductor, setMensajeReproductor] = useState("");
  const [tipoMensajeReproductor, setTipoMensajeReproductor] = useState("error");
  const [mensajeReproductorVisible, setMensajeReproductorVisible] = useState(false);
  const [historialReproducciones, setHistorialReproducciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [limpiandoHistorial, setLimpiandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(false);
  const [errorFavoritos, setErrorFavoritos] = useState("");
  const [siguiendo, setSiguiendo] = useState([]);
  const [seguidores, setSeguidores] = useState([]);
  const [tabSeguidores, setTabSeguidores] = useState(null);
  const [origenComunidad, setOrigenComunidad] = useState(null);
  const [busquedaUsuariosSeguidores, setBusquedaUsuariosSeguidores] = useState("");
  const [usuariosSugeridosSeguidores, setUsuariosSugeridosSeguidores] = useState([]);
  const [cargandoSeguidores, setCargandoSeguidores] = useState(false);
  const [cargandoBusquedaSeguidores, setCargandoBusquedaSeguidores] = useState(false);
  const [mensajeSeguidores, setMensajeSeguidores] = useState("");
  const [errorSeguidores, setErrorSeguidores] = useState("");
  const [perfilPublico, setPerfilPublico] = useState(null);
  const [cargandoPerfilPublico, setCargandoPerfilPublico] = useState(false);
  const [errorPerfilPublico, setErrorPerfilPublico] = useState("");
  const [vistaAnteriorPerfil, setVistaAnteriorPerfil] = useState("inicio");
  const [chatInicialId, setChatInicialId] = useState(null);
  const [perfilPrivado, setPerfilPrivado] = useState(false);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [tema, setTema] = useState(
    () => localStorage.getItem("istream:tema") || "claro"
  );
  const [recientesBusqueda, setRecientesBusqueda] = useState({
    canciones: [],
    artistas: [],
  });

  const fotoPerfilUsuario =
    typeof usuario?.fotoPerfil === "string" && usuario.fotoPerfil.trim()
      ? resolverUrlImagen(usuario.fotoPerfil.trim())
      : "";
  const portadaPerfilUsuario = resolverUrlImagen(usuario?.portadaUrl || null);
  const searchAreaRef = useRef(null);
  const audioRef = useRef(null);
  const claveRecientesBusqueda = useMemo(
    () => (usuario?.id ? `istream:recientes:usuario:${usuario.id}` : null),
    [usuario?.id]
  );

  const favoritosPorClave = useMemo(() => {
    const mapa = new Map();

    favoritos.forEach((favorito) => {
      const titulo = String(favorito?.cancion?.titulo || "").trim().toLowerCase();
      const artista = String(favorito?.cancion?.artista || "").trim().toLowerCase();

      if (titulo && artista) {
        mapa.set(`${titulo}::${artista}`, favorito);
      }
    });

    return mapa;
  }, [favoritos]);

  const playlistActiva = useMemo(
    () => playlistsUsuario.find((playlist) => playlist.id === playlistSeleccionadaId) || null,
    [playlistsUsuario, playlistSeleccionadaId]
  );

  const miPlaylist = playlistActiva?.canciones || [];

  const fallbackPortadasCancion = useMemo(() => {
    const portadaPorArtista = new Map();
    const portadaPorAlbum = new Map();
    const portadaPorArtistaAlbum = new Map();

    artistasCatalogo.forEach((artista) => {
      const claveArtista = normalizarClaveTexto(artista.nombre);

      if (!claveArtista) {
        return;
      }

      const foto = obtenerFotoArtista(artista.foto);

      if (foto) {
        portadaPorArtista.set(claveArtista, foto);
      }
    });

    cancionesPopulares.forEach((cancion) => {
      const portada = obtenerPortadaCancionDirecta(cancion);

      if (!portada) {
        return;
      }

      const claveArtista = normalizarClaveTexto(cancion.artista);
      const claveAlbum = normalizarClaveTexto(cancion.album);

      if (claveArtista && claveAlbum) {
        portadaPorArtistaAlbum.set(`${claveArtista}::${claveAlbum}`, portada);
      }

      if (claveAlbum && !portadaPorAlbum.has(claveAlbum)) {
        portadaPorAlbum.set(claveAlbum, portada);
      }

      if (claveArtista && !portadaPorArtista.has(claveArtista)) {
        portadaPorArtista.set(claveArtista, portada);
      }
    });

    return {
      portadaPorArtista,
      portadaPorAlbum,
      portadaPorArtistaAlbum,
    };
  }, [artistasCatalogo, cancionesPopulares]);

  const obtenerPortadaCancionResuelta = (cancion) =>
    obtenerPortadaCancion(cancion, fallbackPortadasCancion);

  const cancionesRecientesSugeridas = useMemo(() => {
    const vistos = new Set();
    const salida = [];

    const agregar = (cancion) => {
      if (!cancion?.titulo || !cancion?.artista) {
        return;
      }

      const clave = `${cancion.titulo}::${cancion.artista}`.toLowerCase();

      if (vistos.has(clave)) {
        return;
      }

      vistos.add(clave);
      salida.push(cancion);
    };

    recientesBusqueda.canciones.forEach(agregar);
    historialReproducciones.forEach((registro) => {
      agregar(registro.cancion);
    });

    return salida.slice(0, 6);
  }, [recientesBusqueda.canciones, historialReproducciones]);

  const artistasRecientesSugeridos = useMemo(() => {
    const vistos = new Set();
    const salida = [];

    const agregar = (nombreArtista) => {
      const nombre = String(nombreArtista || "").trim();

      if (!nombre) {
        return;
      }

      const clave = nombre.toLowerCase();

      if (vistos.has(clave)) {
        return;
      }

      vistos.add(clave);
      salida.push(nombre);
    };

    recientesBusqueda.artistas.forEach(agregar);
    historialReproducciones.forEach((registro) => {
      agregar(registro.cancion?.artista);
    });

    return salida.slice(0, 6);
  }, [recientesBusqueda.artistas, historialReproducciones]);

  const cancionesContinuarEscuchando = useMemo(
    () => cancionesRecientesSugeridas.slice(0, 6),
    [cancionesRecientesSugeridas]
  );

  const artistasRecomendados = useMemo(() => {
    const normalizarNombre = (valor) =>
      String(valor || "").trim().toLowerCase();

    const catalogoPorNombre = new Map(
      artistasCatalogo.map((artista) => [normalizarNombre(artista.nombre), artista])
    );

    const vistos = new Set();
    const salida = [];

    artistasRecientesSugeridos.forEach((nombre) => {
      const clave = normalizarNombre(nombre);

      if (!clave || vistos.has(clave)) {
        return;
      }

      vistos.add(clave);
      salida.push(
        catalogoPorNombre.get(clave) || {
          id: `recomendado-${clave}`,
          nombre,
          foto: FOTO_ARTISTA_BLANCA,
        }
      );
    });

    artistasCatalogo.forEach((artista) => {
      const clave = normalizarNombre(artista.nombre);

      if (!clave || vistos.has(clave)) {
        return;
      }

      vistos.add(clave);
      salida.push(artista);
    });

    return salida.slice(0, 5);
  }, [artistasRecientesSugeridos, artistasCatalogo]);

  const artistasPopularesInicio = useMemo(() => {
    const normalizarNombre = (valor) =>
      String(valor || "").trim().toLowerCase();

    const catalogoPorNombre = new Map(
      artistasCatalogo.map((artista) => [normalizarNombre(artista.nombre), artista])
    );

    const vistos = new Set();
    const salida = [];

    cancionesPopulares.forEach((cancion) => {
      const nombre = String(cancion?.artista || "").trim();
      const clave = normalizarNombre(nombre);

      if (!clave || vistos.has(clave)) {
        return;
      }

      vistos.add(clave);
      salida.push(
        catalogoPorNombre.get(clave) || {
          id: `popular-${clave}`,
          nombre,
          foto: FOTO_ARTISTA_BLANCA,
        }
      );
    });

    artistasCatalogo.forEach((artista) => {
      const clave = normalizarNombre(artista.nombre);

      if (!clave || vistos.has(clave)) {
        return;
      }

      vistos.add(clave);
      salida.push(artista);
    });

    return salida.slice(0, 5);
  }, [cancionesPopulares, artistasCatalogo]);

  const resumenPerfil = useMemo(() => {
    const totalCancionesEnPlaylists = playlistsUsuario.reduce(
      (acumulado, playlist) => acumulado + (playlist.canciones?.length || 0),
      0
    );

    const reproduccionesUltimos7Dias = historialReproducciones.filter((registro) => {
      const fechaRegistro = registro?.reproducidoEn || registro?.fecha_reproduccion;

      if (!fechaRegistro) {
        return false;
      }

      const fecha = new Date(fechaRegistro);

      if (Number.isNaN(fecha.getTime())) {
        return false;
      }

      const haceSieteDias = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return fecha.getTime() >= haceSieteDias;
    }).length;

    const topArtista = (() => {
      const conteo = new Map();

      historialReproducciones.forEach((registro) => {
        const nombre = String(registro?.cancion?.artista || "").trim();

        if (!nombre) {
          return;
        }

        conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
      });

      let artistaGanador = "Sin datos";
      let totalGanador = 0;

      conteo.forEach((total, artista) => {
        if (total > totalGanador) {
          totalGanador = total;
          artistaGanador = artista;
        }
      });

      return artistaGanador;
    })();

    return {
      playlists: playlistsUsuario.length,
      cancionesGuardadas: totalCancionesEnPlaylists,
      favoritos: favoritos.length,
      reproduccionesUltimos7Dias,
      topArtista,
      actividadReciente: historialReproducciones.slice(0, 5),
    };
  }, [favoritos.length, historialReproducciones, playlistsUsuario]);

  const actualizarRecientesBusqueda = (actualizador) => {
    setRecientesBusqueda((anterior) => {
      const siguiente = actualizador(anterior);

      if (claveRecientesBusqueda) {
        localStorage.setItem(claveRecientesBusqueda, JSON.stringify(siguiente));
      }

      return siguiente;
    });
  };

  const mostrarMensajeReproductor = (mensaje, tipo = "error") => {
    setMensajeReproductor(mensaje);
    setTipoMensajeReproductor(tipo);
    setMensajeReproductorVisible(true);
  };

  const limpiarMensajeReproductor = () => {
    setMensajeReproductorVisible(false);
  };

  const registrarCancionReciente = (cancion) => {
    if (!cancion?.titulo || !cancion?.artista) {
      return;
    }

    actualizarRecientesBusqueda((anterior) => {
      const cancionesSinDuplicados = anterior.canciones.filter(
        (item) => !(item.titulo === cancion.titulo && item.artista === cancion.artista)
      );

      return {
        ...anterior,
        canciones: [
          {
            id: cancion.id || null,
            titulo: cancion.titulo,
            artista: cancion.artista,
            album: cancion.album || "Sin álbum",
            audioUrl: cancion.audioUrl || null,
          },
          ...cancionesSinDuplicados,
        ].slice(0, 8),
      };
    });
  };

  const registrarArtistaReciente = (nombreArtista) => {
    const nombre = String(nombreArtista || "").trim();

    if (!nombre) {
      return;
    }

    actualizarRecientesBusqueda((anterior) => ({
      ...anterior,
      artistas: [nombre, ...anterior.artistas.filter((item) => item !== nombre)].slice(0, 8),
    }));
  };

  const limpiarRecientesBusqueda = async () => {
    setRecientesBusqueda({ canciones: [], artistas: [] });

    if (claveRecientesBusqueda) {
      localStorage.removeItem(claveRecientesBusqueda);
    }

    await limpiarHistorial();
  };

  const sincronizarFormulario = (usuarioActual) => {
    setPerfilForm({
      nombre: usuarioActual?.nombre || "",
      correo: usuarioActual?.correo || "",
      ciudad: usuarioActual?.ciudad || "",
      biografia: usuarioActual?.biografia || "",
    });
  };

  useEffect(() => {
    if (!usuario) {
      return;
    }

    sincronizarFormulario(usuario);
    cargarPerfil();
  }, [usuario?.id]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("istream:tema", tema);
  }, [tema]);

  useEffect(() => {
    const cargarArtistas = async () => {
      try {
        setCargandoArtistas(true);
        const respuesta = await fetch(`${API_URL}/artistas`);
        const datos = await leerJsonSeguro(respuesta);

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No se pudo cargar el catálogo.");
        }

        setArtistasCatalogo(datos.artistas || []);
      } catch {
        setArtistasCatalogo([]);
      } finally {
        setCargandoArtistas(false);
      }
    };

    cargarArtistas();
  }, []);

  const obtenerHeadersAutenticados = () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      return null;
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const cerrarSesionPorExpiracion = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    setUsuario(null);
  };

  const manejarSesionExpirada = (respuesta) => {
    if (respuesta.status !== 401) {
      return false;
    }

    cerrarSesionPorExpiracion();
    return true;
  };

  const cargarCancionesPopulares = async () => {
  const headers = obtenerHeadersAutenticados();

  if (!headers) {
    setCancionesPopulares([]);
    setErrorPopulares("");
    return;
  }

  try {
    setCargandoPopulares(true);
    setErrorPopulares("");

    const respuesta = await fetch(
      `${API_URL}/canciones/populares`,
      {
        method: "GET",
        headers,
      }
    );

    const datos = await leerJsonSeguro(respuesta);

    /*
     * Si la sesión expiró o la cuenta ya no
     * tiene acceso, se cierra la sesión local.
     */
    if (
      respuesta.status === 401 ||
      respuesta.status === 403
    ) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("usuario");
      setUsuario(null);
      return;
    }

    if (!respuesta.ok) {
      throw new Error(
        datos.mensaje ||
          "No se pudieron cargar las canciones populares."
      );
    }

    setCancionesPopulares(
      Array.isArray(datos.canciones)
        ? datos.canciones
        : []
    );
  } catch (error) {
    setCancionesPopulares([]);

    setErrorPopulares(
      normalizarErrorRed(
        error,
        "No se pudieron cargar las canciones populares."
      )
    );
  } finally {
    setCargandoPopulares(false);
  }
};

  useEffect(() => {
    if (!usuario?.id) {
      setCancionesPopulares([]);
      setErrorPopulares("");
      setCargandoPopulares(false);
      return;
    }

    cargarCancionesPopulares();

    const intervalo = setInterval(() => {
      cargarCancionesPopulares();
    }, INTERVALO_ACTUALIZACION_POPULARES_MS);

    return () => {
      clearInterval(intervalo);
    };
  }, [usuario?.id]);

  const cargarHistorial = async () => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      setHistorialReproducciones([]);
      return;
    }

    try {
      setCargandoHistorial(true);
      setErrorHistorial("");

      const respuesta = await fetch(`${API_URL}/historial`, {
        headers,
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo cargar el historial.");
      }

      setHistorialReproducciones(datos.historial || []);
    } catch (error) {
      setErrorHistorial(
        normalizarErrorRed(
          error,
          "No se pudo cargar el historial."
        )
      );
      setHistorialReproducciones([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const claveCancion = (cancion) => {
    const titulo = String(cancion?.titulo || "").trim().toLowerCase();
    const artista = String(cancion?.artista || "").trim().toLowerCase();

    if (!titulo || !artista) {
      return null;
    }

    return `${titulo}::${artista}`;
  };

  const obtenerFavoritoDeCancion = (cancion) => {
    const clave = claveCancion(cancion);

    if (!clave) {
      return null;
    }

    return favoritosPorClave.get(clave) || null;
  };

  const esCancionFavorita = (cancion) => Boolean(obtenerFavoritoDeCancion(cancion));

  const cargarFavoritos = async () => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      setFavoritos([]);
      return;
    }

    try {
      setCargandoFavoritos(true);
      setErrorFavoritos("");

      const respuesta = await fetch(`${API_URL}/favoritos`, { headers });
      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudieron cargar tus favoritos.");
      }

      setFavoritos(datos.favoritos || []);
    } catch (error) {
      setErrorFavoritos(
        normalizarErrorRed(
          error,
          "No se pudieron cargar tus favoritos."
        )
      );
      setFavoritos([]);
    } finally {
      setCargandoFavoritos(false);
    }
  };

  const agregarAFavoritos = async (cancion) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/favoritos`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          idCancion: cancion.id,
          titulo: cancion.titulo,
          artista: cancion.artista,
          album: cancion.album,
          audioUrl: cancion.audioUrl,
        }),
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar en favoritos.");
      }

      if (datos.favorito) {
        setFavoritos((anterior) => {
          const resto = anterior.filter((item) => item.id !== datos.favorito.id);
          return [datos.favorito, ...resto];
        });
      }
    } catch (error) {
      setErrorFavoritos(
        normalizarErrorRed(
          error,
          "No se pudo guardar en favoritos."
        )
      );
    }
  };

  const quitarDeFavoritos = async (idFavorito) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/favoritos/${idFavorito}`, {
        method: "DELETE",
        headers,
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo quitar de favoritos.");
      }

      setFavoritos((anterior) => anterior.filter((item) => item.id !== idFavorito));
    } catch (error) {
      setErrorFavoritos(
        normalizarErrorRed(
          error,
          "No se pudo quitar de favoritos."
        )
      );
    }
  };

  const alternarFavoritoCancion = async (cancion) => {
    const favorito = obtenerFavoritoDeCancion(cancion);

    if (favorito?.id) {
      await quitarDeFavoritos(favorito.id);
      return;
    }

    await agregarAFavoritos(cancion);
  };

  const registrarReproduccionEnHistorial = async (cancion) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/historial`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          idCancion: cancion.id,
          titulo: cancion.titulo,
          artista: cancion.artista,
          album: cancion.album,
        }),
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        return;
      }

      if (datos.registro) {
        setHistorialReproducciones((anterior) => [datos.registro, ...anterior].slice(0, 200));
      }
    } catch {
      // El registro de historial no debe interrumpir la reproducción.
    }
  };

  const eliminarEntradaHistorial = async (idRegistro) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/historial/${idRegistro}`, {
        method: "DELETE",
        headers,
      });

      if (!respuesta.ok) {
        const datos = await leerJsonSeguro(respuesta);
        throw new Error(datos.mensaje || "No se pudo eliminar el registro.");
      }

      setHistorialReproducciones((anterior) => anterior.filter((item) => item.id !== idRegistro));
    } catch (error) {
      setErrorHistorial(
        normalizarErrorRed(
          error,
          "No se pudo eliminar el registro."
        )
      );
    }
  };

  const limpiarHistorial = async () => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return;
    }

    try {
      setLimpiandoHistorial(true);
      setErrorHistorial("");

      const respuesta = await fetch(`${API_URL}/historial`, {
        method: "DELETE",
        headers,
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo limpiar el historial.");
      }

      setHistorialReproducciones([]);
    } catch (error) {
      setErrorHistorial(
        normalizarErrorRed(
          error,
          "No se pudo limpiar el historial."
        )
      );
    } finally {
      setLimpiandoHistorial(false);
    }
  };

  const cargarRedSeguidores = async () => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      setSiguiendo([]);
      setSeguidores([]);
      return;
    }

    const respuesta = await fetch(`${API_URL}/amistades`, {
      method: "GET",
      headers,
    });

    if (manejarSesionExpirada(respuesta)) {
      return;
    }

    const datos = await leerJsonSeguro(respuesta);

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudo cargar tu red de seguidores.");
    }

    setSiguiendo(Array.isArray(datos.siguiendo) ? datos.siguiendo : []);
    setSeguidores(Array.isArray(datos.seguidores) ? datos.seguidores : []);
  };

  const cargarModuloSeguidores = async () => {
    try {
      setCargandoSeguidores(true);
      setErrorSeguidores("");
      await cargarRedSeguidores();
    } catch (error) {
      setErrorSeguidores(
        normalizarErrorRed(
          error,
          "No se pudo cargar el apartado de seguidores."
        )
      );
    } finally {
      setCargandoSeguidores(false);
    }
  };

  const cargarPerfilPublico = async ({ tipo, id, nombre }) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return null;
    }

    const ruta =
      tipo === "artista"
        ? `${API_URL}/perfiles/artista/${encodeURIComponent(id ?? nombre)}`
        : `${API_URL}/perfiles/usuario/${id}`;

    const respuesta = await fetch(ruta, { headers });

    if (manejarSesionExpirada(respuesta)) {
      return null;
    }

    const datos = await leerJsonSeguro(respuesta);

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudo cargar el perfil.");
    }

    return datos.perfil;
  };

  const abrirPerfilPublico = async ({ tipo, id, nombre }) => {
    try {
      setCargandoPerfilPublico(true);
      setErrorPerfilPublico("");

      if (vistaActiva !== "perfil-publico") {
        setVistaAnteriorPerfil(vistaActiva);
      }

      const perfil = await cargarPerfilPublico({ tipo, id, nombre });

      setPerfilPublico(perfil);
      setBusqueda("");
      setBusquedaAbierta(false);
      setVistaActiva("perfil-publico");
    } catch (error) {
      setPerfilPublico(null);
      setErrorPerfilPublico(normalizarErrorRed(error, "No se pudo cargar el perfil."));
      setVistaActiva("perfil-publico");
    } finally {
      setCargandoPerfilPublico(false);
    }
  };

  const refrescarPerfilPublico = async () => {
    if (!perfilPublico) {
      return;
    }

    try {
      const perfil =
        perfilPublico.tipo === "artista"
          ? await cargarPerfilPublico({ tipo: "artista", id: perfilPublico.idArtista })
          : await cargarPerfilPublico({ tipo: "usuario", id: perfilPublico.idUsuario });

      setPerfilPublico(perfil);
    } catch {
      // El perfil ya cargado se mantiene visible si el refresco falla.
    }
  };

  const seguirDesdePerfilPublico = async (idUsuario) => {
    await seguirUsuario(idUsuario);
    await refrescarPerfilPublico();
  };

  const dejarDeSeguirDesdePerfilPublico = async (idUsuario) => {
    await dejarDeSeguirUsuario(idUsuario);
    await refrescarPerfilPublico();
  };

  const abrirChatConUsuario = (idUsuario) => {
    setChatInicialId(idUsuario);
    cambiarVista("social");
  };

  const verPerfilAmigo = (idUsuario) => abrirPerfilPublico({ tipo: "usuario", id: idUsuario });

  const cambiarPrivacidadPerfil = async (privado) => {
    const headers = obtenerHeadersAutenticados();
    if (!headers) return;

    try {
      const respuesta = await fetch(`${API_URL}/auth/privacidad`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ privado }),
      });

      if (manejarSesionExpirada(respuesta)) return;

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) throw new Error(datos.mensaje || "Error al actualizar privacidad.");

      setPerfilPrivado(datos.perfilPrivado);
    } catch (error) {
      setErrorPerfil(normalizarErrorRed(error, "No se pudo actualizar la privacidad."));
    }
  };

  const buscarUsuariosParaSeguir = async (termino) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      setUsuariosSugeridosSeguidores([]);
      return;
    }

    const respuesta = await fetch(
      `${API_URL}/amistades/usuarios?query=${encodeURIComponent(termino)}`,
      {
        method: "GET",
        headers,
      }
    );

    if (manejarSesionExpirada(respuesta)) {
      return;
    }

    const datos = await leerJsonSeguro(respuesta);

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudieron buscar usuarios.");
    }

    setUsuariosSugeridosSeguidores(Array.isArray(datos.usuarios) ? datos.usuarios : []);
  };

  const seguirUsuario = async (idUsuario) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return;
    }

    try {
      setErrorSeguidores("");
      setMensajeSeguidores("");

      const respuesta = await fetch(`${API_URL}/amistades/follow`, {
        method: "POST",
        headers,
        body: JSON.stringify({ idUsuario }),
      });

      if (manejarSesionExpirada(respuesta)) {
        return;
      }

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo seguir al usuario.");
      }

      setMensajeSeguidores(datos.mensaje || "Ahora sigues a este usuario.");
      setBusquedaUsuariosSeguidores("");
      setUsuariosSugeridosSeguidores([]);
      setTimeout(() => setMensajeSeguidores(""), 3500);
      await cargarRedSeguidores();
    } catch (error) {
      setErrorSeguidores(
        normalizarErrorRed(
          error,
          "No se pudo seguir al usuario."
        )
      );
      setTimeout(() => setErrorSeguidores(""), 3500);
    }
  };

  const dejarDeSeguirUsuario = async (idUsuario) => {
    const headers = obtenerHeadersAutenticados();

    if (!headers) {
      return;
    }

    try {
      setErrorSeguidores("");
      setMensajeSeguidores("");

      const respuesta = await fetch(`${API_URL}/amistades/follow/${idUsuario}`, {
        method: "DELETE",
        headers,
      });

      if (manejarSesionExpirada(respuesta)) {
        return;
      }

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo dejar de seguir al usuario.");
      }

      setMensajeSeguidores(datos.mensaje || "Has dejado de seguir a este usuario.");
      setTimeout(() => setMensajeSeguidores(""), 3500);
      await cargarRedSeguidores();
    } catch (error) {
      setErrorSeguidores(
        normalizarErrorRed(
          error,
          "No se pudo dejar de seguir al usuario."
        )
      );
      setTimeout(() => setErrorSeguidores(""), 3500);
    }
  };

  useEffect(() => {
    if (!usuario?.id) {
      return;
    }

    cargarHistorial();
    cargarFavoritos();
  }, [usuario?.id]);

  useEffect(() => {
    if (!usuario?.id || vistaActiva !== "perfil") {
      return;
    }

    cargarModuloSeguidores();
  }, [usuario?.id, vistaActiva]);

  useEffect(() => {
    if (!usuario?.id || vistaActiva !== "perfil") {
      return;
    }

    const termino = busquedaUsuariosSeguidores.trim();

    if (!termino) {
      setUsuariosSugeridosSeguidores([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const headers = obtenerHeadersAutenticados();

      if (!headers) {
        return;
      }

      try {
        setCargandoBusquedaSeguidores(true);
        await buscarUsuariosParaSeguir(termino);
      } catch (error) {
        setErrorSeguidores(
          normalizarErrorRed(
            error,
            "No se pudieron buscar usuarios."
          )
        );
        setUsuariosSugeridosSeguidores([]);
      } finally {
        setCargandoBusquedaSeguidores(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [usuario?.id, vistaActiva, busquedaUsuariosSeguidores]);

  useEffect(() => {
    if (!claveRecientesBusqueda) {
      return;
    }

    try {
      const crudo = localStorage.getItem(claveRecientesBusqueda);

      if (!crudo) {
        setRecientesBusqueda({ canciones: [], artistas: [] });
        return;
      }

      const parseado = JSON.parse(crudo);

      setRecientesBusqueda({
        canciones: Array.isArray(parseado?.canciones) ? parseado.canciones : [],
        artistas: Array.isArray(parseado?.artistas) ? parseado.artistas : [],
      });
    } catch {
      setRecientesBusqueda({ canciones: [], artistas: [] });
    }
  }, [claveRecientesBusqueda]);

  useEffect(() => {
    if (!mensajeReproductor) {
      return;
    }

    setMensajeReproductorVisible(true);

    const timeoutOcultarId = setTimeout(() => {
      setMensajeReproductorVisible(false);
    }, 2800);

    const timeoutLimpiarId = setTimeout(() => {
      setMensajeReproductor("");
    }, 3200);

    return () => {
      clearTimeout(timeoutOcultarId);
      clearTimeout(timeoutLimpiarId);
    };
  }, [mensajeReproductor]);

  useEffect(() => {
    const cerrarBusquedaAlSalir = (event) => {
      if (!busquedaAbierta) {
        return;
      }

      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target)) {
        setBusquedaAbierta(false);
        setMenuAgregarPlaylistCancionId(null);
      }
    };

    document.addEventListener("mousedown", cerrarBusquedaAlSalir);

    return () => document.removeEventListener("mousedown", cerrarBusquedaAlSalir);
  }, [busquedaAbierta]);

  useEffect(() => {
    const cerrarMenuCancionPorFuera = (event) => {
      if (event.target.closest(".song-actions-menu")) {
        return;
      }

      setMenuAccionesCancionId(null);
    };

    document.addEventListener("mousedown", cerrarMenuCancionPorFuera);

    return () => {
      document.removeEventListener("mousedown", cerrarMenuCancionPorFuera);
    };
  }, []);

  const cargarPerfil = async () => {
    const token = sessionStorage.getItem("token");

    if (!token || !usuario) {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("usuario");
  setUsuario(null);

  return;
}

    try {
      setCargandoPerfil(true);
      setErrorPerfil("");

      const respuesta = await fetch(`${API_URL}/auth/perfil`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const datos = await leerJsonSeguro(respuesta);

      if (
  respuesta.status === 401
) {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("usuario");
  setUsuario(null);

  return;
}

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo cargar el perfil.");
      }

      const usuarioActualizado = {
        ...usuario,
        ...datos.usuario,
      };

      sessionStorage.setItem("usuario", JSON.stringify(usuarioActualizado));
      setUsuario(usuarioActualizado);
      setPerfilPrivado(Boolean(datos.usuario?.perfilPrivado));
      sincronizarFormulario(usuarioActualizado);
    } catch (error) {
      setErrorPerfil(error.message);
    } finally {
      setCargandoPerfil(false);
    }
  };

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setPerfilForm((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const validarPerfil = () => {
    if (!perfilForm.nombre.trim() || perfilForm.nombre.trim().length < 2) {
      setErrorPerfil("El nombre debe tener al menos 2 caracteres.");
      return false;
    }

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoValido.test(perfilForm.correo.trim())) {
      setErrorPerfil("Ingrese un correo electrónico válido.");
      return false;
    }

    return true;
  };

  const guardarPerfil = async (event) => {
    event.preventDefault();

    setMensajePerfil("");
    setErrorPerfil("");

    if (!validarPerfil()) {
      return;
    }

    try {
      setGuardandoPerfil(true);
      const token = sessionStorage.getItem("token");

      const respuesta = await fetch(`${API_URL}/auth/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
  nombre: perfilForm.nombre.trim(),
  correo: perfilForm.correo.trim(),
  ciudad: perfilForm.ciudad.trim(),
  biografia: perfilForm.biografia.trim(),
  fotoPerfil: usuario?.fotoPerfil ?? null,
  telefono: usuario?.telefono ?? null,
}),
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar el perfil.");
      }

      const usuarioActualizado = {
        ...usuario,
        nombre: perfilForm.nombre.trim(),
        correo: perfilForm.correo.trim(),
        ciudad: perfilForm.ciudad.trim(),
        biografia: perfilForm.biografia.trim(),
      };

      sessionStorage.setItem("usuario", JSON.stringify(usuarioActualizado));
      setUsuario(usuarioActualizado);
      setMensajePerfil(datos.mensaje || "Perfil actualizado correctamente.");
    } catch (error) {
      setErrorPerfil(error.message);
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const subirImagenUsuario = async (tipo, archivo) => {
    if (!archivo) {
      return;
    }

    const setSubiendo = tipo === "foto" ? setSubiendoFotoUsuario : setSubiendoPortadaUsuario;
    const campoFormulario = tipo === "foto" ? "foto" : "portada";
    const token = sessionStorage.getItem("token");

    setErrorPerfil("");
    setMensajePerfil("");

    try {
      setSubiendo(true);

      const cuerpo = new FormData();
      cuerpo.append(campoFormulario, archivo);

      const respuesta = await fetch(`${API_URL}/auth/perfil/${tipo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: cuerpo,
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo subir la imagen.");
      }

      const usuarioActualizado = {
        ...usuario,
        ...(tipo === "foto" ? { fotoPerfil: datos.fotoPerfil } : { portadaUrl: datos.portadaUrl }),
      };

      sessionStorage.setItem("usuario", JSON.stringify(usuarioActualizado));
      setUsuario(usuarioActualizado);
      setMensajePerfil(datos.mensaje || "Imagen actualizada correctamente.");
    } catch (error) {
      setErrorPerfil(error.message);
    } finally {
      setSubiendo(false);
    }
  };

  const seleccionarImagenUsuario = (tipo, archivo) => {
    if (!archivo) {
      return;
    }

    setRecorteUsuario({ tipo, urlOriginal: URL.createObjectURL(archivo) });
  };

  const cerrarRecorteUsuario = () => {
    if (recorteUsuario) {
      URL.revokeObjectURL(recorteUsuario.urlOriginal);
    }

    setRecorteUsuario(null);
  };

  const confirmarRecorteUsuario = async (blob) => {
    const tipo = recorteUsuario.tipo;
    const archivoRecortado = new File([blob], `${tipo}.jpg`, { type: "image/jpeg" });

    cerrarRecorteUsuario();
    await subirImagenUsuario(tipo, archivoRecortado);
  };

  const cambiarVista = (nuevaVista) => {
    const vistaDestino = nuevaVista === "playlist" ? "biblioteca" : nuevaVista;

    if (vistaActiva === "player" && nuevaVista !== "player") {
      setMiniPlayerVisible(true);
    }

    if (vistaDestino === "player") {
      setMiniPlayerVisible(false);
    }

    setVistaActiva(vistaDestino);
  };

  const abrirPlayer = () => {
    setMiniPlayerVisible(false);
    setVistaActiva("player");
  };

  const minimizarPlayer = () => {
    setMiniPlayerVisible(true);
    setVistaActiva("inicio");
  };

  useEffect(() => {
    const debounce = setTimeout(async () => {
      const termino = busqueda.trim();

      if (!termino) {
        setResultadosBusqueda({
          canciones: [],
          artistas: [],
          albums: [],
          mensaje: "",
        });
        return;
      }

      try {
        setCargandoBusqueda(true);
        const respuesta = await fetch(`${API_URL}/busqueda?query=${encodeURIComponent(termino)}`);
        const datos = await leerJsonSeguro(respuesta);

        setResultadosBusqueda({
          canciones: datos.canciones || [],
          artistas: datos.artistas || [],
          albums: datos.albums || [],
          mensaje: datos.mensaje || "",
        });
      } catch {
        setResultadosBusqueda({
          canciones: [],
          artistas: [],
          albums: [],
          mensaje: "No se pudo completar la búsqueda en este momento.",
        });
      } finally {
        setCargandoBusqueda(false);
      }
    }, 250);

    return () => clearTimeout(debounce);
  }, [busqueda]);

  const hayResultados = useMemo(
    () =>
      resultadosBusqueda.canciones.length > 0 ||
      resultadosBusqueda.artistas.length > 0 ||
      resultadosBusqueda.albums.length > 0,
    [resultadosBusqueda]
  );

  const seleccionarAlbum = (nombreAlbum) => {
    setBusqueda(nombreAlbum || "");
    setBusquedaAbierta(false);
  };

  const confirmarBusqueda = () => {
    if (cargandoBusqueda) {
      return;
    }

    const primeraCancion = resultadosBusqueda.canciones[0];
    if (primeraCancion) {
      seleccionarCancion(primeraCancion);
      return;
    }

    const primerArtista = resultadosBusqueda.artistas[0];
    if (primerArtista?.nombre) {
      abrirPerfilArtista(primerArtista.nombre);
      return;
    }

    const primerAlbum = resultadosBusqueda.albums[0];
    if (primerAlbum?.nombre) {
      seleccionarAlbum(primerAlbum.nombre);
      return;
    }

    setBusquedaAbierta(false);
  };

  const seleccionarCancion = (cancion) => {
    registrarCancionReciente(cancion);
    const audioUrl =
      cancion.id && cancion.audioUrl
        ? `${API_URL}/canciones/${cancion.id}/audio`
        : cancion.audioUrl || AUDIO_SAMPLES[(cancion.id || 1) % AUDIO_SAMPLES.length];
    const portada = obtenerPortadaCancionResuelta(cancion);

    setCancionActual({
      id: cancion.id || Math.random(),
      titulo: cancion.titulo || "Canción desconocida",
      artista: cancion.artista || "Artista desconocido",
      album: cancion.album || "Álbum desconocido",
      audioUrl: audioUrl,
      duracion: cancion.duracion || 0,
      portada,
    });
    setMensajeReproductor("");
    setReproduciendo(false);
    setProgreso(0);
    setBusqueda("");
    setBusquedaAbierta(false);
    abrirPlayer();
  };

  const abrirPerfilArtista = (artistaNombre) => {
    registrarArtistaReciente(artistaNombre);
    return abrirPerfilPublico({ tipo: "artista", nombre: artistaNombre });
  };

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const manejarTiempo = () => {
      setProgreso(audio.currentTime || 0);
      setDuracion(audio.duration || 0);
    };

    const manejarCarga = () => {
      setDuracion(audio.duration || 0);
      audio.volume = volumen / 100;
    };

    const manejarError = () => {
      setReproduciendo(false);
      mostrarMensajeReproductor("No se pudo reproducir la canción seleccionada.", "error");
    };

    audio.addEventListener("timeupdate", manejarTiempo);
    audio.addEventListener("loadedmetadata", manejarCarga);
    audio.addEventListener("error", manejarError);

    return () => {
      audio.removeEventListener("timeupdate", manejarTiempo);
      audio.removeEventListener("loadedmetadata", manejarCarga);
      audio.removeEventListener("error", manejarError);
    };
  }, [cancionActual.audioUrl, volumen]);

  const alternarReproduccion = async () => {
    const audio = audioRef.current;

    if (!audio) {
      mostrarMensajeReproductor("La reproducción no está disponible en este momento.", "error");
      return;
    }

    try {
      if (reproduciendo) {
        audio.pause();
        setReproduciendo(false);
        return;
      }

      await audio.play();
      setReproduciendo(true);
      limpiarMensajeReproductor();
      registrarReproduccionEnHistorial(cancionActual);
    } catch {
      setReproduciendo(false);
      mostrarMensajeReproductor("No se pudo iniciar la reproducción. Intente otra canción.", "error");
    }
  };

  const cambiarTiempo = (event) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const siguienteTiempo = Number(event.target.value);
    audio.currentTime = siguienteTiempo;
    setProgreso(siguienteTiempo);
  };

  const agregarAPlaylist = (cancion, playlistIdDestino = playlistSeleccionadaId) => {
    if (!playlistIdDestino) {
      mostrarMensajeReproductor("No hay una playlist creada.", "error");
      return;
    }

    const playlistDestino = playlistsUsuario.find((playlist) => playlist.id === playlistIdDestino);

    if (!playlistDestino) {
      mostrarMensajeReproductor("No hay una playlist creada.", "error");
      return;
    }

    const yaExiste = playlistDestino.canciones.some((c) => c.id === cancion.id);
    if (!yaExiste) {
      setPlaylistsUsuario((anterior) =>
        anterior.map((playlist) =>
          playlist.id === playlistIdDestino
            ? {
                ...playlist,
                canciones: [...playlist.canciones, cancion],
              }
            : playlist
        )
      );
      setBusqueda("");
      setBusquedaAbierta(false);
      setMenuAgregarPlaylistCancionId(null);
      mostrarMensajeReproductor(`Canción agregada a ${playlistDestino.nombre}.`, "success");
      return;
    }

    mostrarMensajeReproductor(`La canción ya está en ${playlistDestino.nombre}.`, "error");
  };

  const seleccionarPlaylistParaCancion = (cancion, playlistIdDestino) => {
    agregarAPlaylist(cancion, playlistIdDestino);
  };

  const agregarCancionActualAPlaylist = () => {
    if (playlistsUsuario.length === 0) {
      mostrarMensajeReproductor(
        "Aún no tienes playlists creadas. Crea una para agregar canciones.",
        "error"
      );
      return;
    }

    if (playlistsUsuario.length === 1) {
      agregarAPlaylist(cancionActual, playlistsUsuario[0].id);
      return;
    }

    setMenuAgregarPlaylistCancionId((anterior) =>
      anterior === PLAYER_PLAYLIST_MENU_ID ? null : PLAYER_PLAYLIST_MENU_ID
    );
  };

  const abrirFormularioPlaylist = () => {
    setMenuPlaylistAbierto(false);
    setCrearPlaylistAbierto(true);
  };

  const cancelarCreacionPlaylist = () => {
    setCrearPlaylistAbierto(false);
    setNombreNuevaPlaylist("");
  };

  const crearPlaylist = (evento) => {
    evento.preventDefault();

    const nombreLimpio = nombreNuevaPlaylist.trim();

    if (!nombreLimpio) {
      mostrarMensajeReproductor("Debes escribir un nombre para crear la playlist.", "error");
      return;
    }

    const nuevaPlaylist = {
      id: `playlist-${Date.now()}`,
      nombre: nombreLimpio,
      canciones: [],
    };

    setPlaylistsUsuario((anterior) => [...anterior, nuevaPlaylist]);
    setPlaylistSeleccionadaId(nuevaPlaylist.id);
    setCrearPlaylistAbierto(false);
    setNombreNuevaPlaylist("");
  };

  const eliminarPlaylistCompleta = () => {
    if (!playlistActiva) {
      return;
    }

    setPlaylistsUsuario((anterior) => {
      const siguiente = anterior.filter((playlist) => playlist.id !== playlistActiva.id);
      setPlaylistSeleccionadaId(siguiente[0]?.id || null);
      return siguiente;
    });

    setIndiceCancionActual(0);
    setMenuPlaylistAbierto(false);
  };

  const eliminarDePlaylist = (cancionId) => {
    if (!playlistActiva) {
      return;
    }

    setMenuAccionesCancionId(null);

    setPlaylistsUsuario((anterior) =>
      anterior.map((playlist) =>
        playlist.id === playlistActiva.id
          ? {
              ...playlist,
              canciones: playlist.canciones.filter((c) => c.id !== cancionId),
            }
          : playlist
      )
    );
  };

  const reproducirDesdePlaylist = (index) => {
    if (miPlaylist[index]) {
      setIndiceCancionActual(index);
      seleccionarCancion(miPlaylist[index]);
      setReproduciendo(false);
      setBusqueda("");
      setBusquedaAbierta(false);
    }
  };

  const cancionAnterior = () => {
    if (indiceCancionActual > 0) {
      const nuevoIndice = indiceCancionActual - 1;
      setIndiceCancionActual(nuevoIndice);
      seleccionarCancion(miPlaylist[nuevoIndice]);
      setReproduciendo(true);
    }
  };

  const cancionSiguiente = () => {
    if (indiceCancionActual < miPlaylist.length - 1) {
      const nuevoIndice = indiceCancionActual + 1;
      setIndiceCancionActual(nuevoIndice);
      seleccionarCancion(miPlaylist[nuevoIndice]);
      setReproduciendo(true);
    }
  };

  const cambiarVolumen = (event) => {
    const nuevoVolumen = Number(event.target.value);
    setVolumen(nuevoVolumen);
    if (audioRef.current) {
      audioRef.current.volume = nuevoVolumen / 100;
    }
  };

  const reproducirCancionDirecta = async (cancion) => {
    seleccionarCancion(cancion);

    setTimeout(async () => {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      try {
        await audio.play();
        setReproduciendo(true);
        limpiarMensajeReproductor();
        registrarReproduccionEnHistorial(cancion);
      } catch {
        setReproduciendo(false);
        mostrarMensajeReproductor("No se pudo iniciar la reproducción. Intente otra canción.", "error");
      }
    }, 0);
  };

  const cerrarSesion = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    setUsuario(null);
    setMensajePerfil("");
    setErrorPerfil("");
    setFormContrasenaPerfil({
      contrasenaActual: "",
      contrasenaNueva: "",
      confirmarContrasenaNueva: "",
    });
    setMensajeContrasenaPerfil("");
    setErrorContrasenaPerfil("");
    setMiniPlayerVisible(false);
    setHistorialReproducciones([]);
    setErrorHistorial("");
    setFavoritos([]);
    setErrorFavoritos("");
    setSiguiendo([]);
    setSeguidores([]);
    setUsuariosSugeridosSeguidores([]);
    setBusquedaUsuariosSeguidores("");
    setMensajeSeguidores("");
    setErrorSeguidores("");
    setPlaylistsUsuario([]);
    setPlaylistSeleccionadaId(null);
    setMenuAccionesCancionId(null);
    setCancionesPopulares([]);
    setErrorPopulares("");
    setCargandoPopulares(false);
  };

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-icon">♫</span>
          <span>iStream</span>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-link ${vistaActiva === "inicio" ? "active" : ""}`}
            onClick={() => cambiarVista("inicio")}
          >
            Inicio
          </button>
          <button
            type="button"
            className={`sidebar-link ${vistaActiva === "social" ? "active" : ""}`}
            onClick={() => cambiarVista("social")}
          >
            Social
          </button>
          <button
            type="button"
            className={`sidebar-link ${vistaActiva === "artistas" ? "active" : ""}`}
            onClick={() => cambiarVista("artistas")}
          >
            Artistas
          </button>
          <button
            type="button"
            className={`sidebar-link ${vistaActiva === "biblioteca" ? "active" : ""}`}
            onClick={() => cambiarVista("biblioteca")}
          >
            Tu biblioteca
          </button>
          <button
            type="button"
            className={`sidebar-link ${vistaActiva === "perfil" ? "active" : ""}`}
            onClick={() => cambiarVista("perfil")}
          >
            Perfil
          </button>
          {usuario.rol === "artista" && (
            <button
              type="button"
              className={`sidebar-link ${vistaActiva === "perfil-artista" ? "active" : ""}`}
              onClick={() => cambiarVista("perfil-artista")}
            >
              Mi perfil de artista
            </button>
          )}
          {usuario.rol === "artista" && (
            <button
              type="button"
              className={`sidebar-link ${vistaActiva === "mi-musica" ? "active" : ""}`}
              onClick={() => cambiarVista("mi-musica")}
            >
              Mi música
            </button>
          )}
        </nav>
      </aside>

      <section
        className={`content-area content-area--${vistaActiva}`}
        id={vistaActiva === "perfil" ? "perfil" : "inicio"}
      >
        <div className="search-area" ref={searchAreaRef}>
          {vistaActiva !== "perfil" && vistaActiva !== "perfil-publico" && (
          <>
          <header className="topbar">
            <div className="logo-pill">iStream</div>
            <input
              className="search-box"
              type="search"
              placeholder="Buscar canciones, artistas o álbumes..."
              value={busqueda}
              onFocus={() => setBusquedaAbierta(true)}
              onChange={(event) => {
                setBusqueda(event.target.value);
                setBusquedaAbierta(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setBusquedaAbierta(false);
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmarBusqueda();
                }
              }}
            />
            <button
              type="button"
              className={`top-avatar ${fotoPerfilUsuario ? "top-avatar--photo" : ""}`}
              aria-label="Perfil"
              onClick={() => {
                setBusquedaAbierta(false);
                cambiarVista("perfil");
              }}
            >
              {fotoPerfilUsuario ? (
                <img src={fotoPerfilUsuario} alt="Foto de perfil" />
              ) : (
                <span aria-hidden="true">U</span>
              )}
            </button>
          </header>

          {busquedaAbierta && (
            <section className={`search-results-panel ${busqueda.trim() ? "search-results-panel--results" : "search-results-panel--recents"}`}>
              <div className="search-results-header">
                <span>{busqueda.trim() ? `Resultados para “${busqueda.trim()}”` : "Recientes"}</span>
                <button type="button" className="search-close-button" onClick={() => setBusquedaAbierta(false)} aria-label="Cerrar búsqueda">
                  ✕
                </button>
                {!busqueda.trim() && (cancionesRecientesSugeridas.length > 0 || artistasRecientesSugeridos.length > 0) && (
                  <button type="button" className="search-clear-button" onClick={limpiarRecientesBusqueda}>
                    Limpiar recientes
                  </button>
                )}
                {cargandoBusqueda && <span className="search-loading">Buscando...</span>}
              </div>

              {!busqueda.trim() && cancionesRecientesSugeridas.length === 0 && artistasRecientesSugeridos.length === 0 && (
                <p className="search-empty">Todavía no tienes canciones ni artistas recientes.</p>
              )}

              {!busqueda.trim() && (cancionesRecientesSugeridas.length > 0 || artistasRecientesSugeridos.length > 0) && (
                <div className="search-groups">
                  {cancionesRecientesSugeridas.length > 0 && (
                    <article className="search-group">
                      <h3>Canciones recientes</h3>
                      <ul>
                        {cancionesRecientesSugeridas.map((cancion, indice) => (
                          <li key={`${cancion.titulo}-${cancion.artista}-${indice}`}>
                            <button type="button" className="search-result-button" onClick={() => seleccionarCancion(cancion)}>
                              <strong>{cancion.titulo}</strong>
                              <span>{cancion.artista} • {cancion.album || "Sin álbum"}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </article>
                  )}

                  {artistasRecientesSugeridos.length > 0 && (
                    <article className="search-group">
                      <h3>Artistas recientes</h3>
                      <ul>
                        {artistasRecientesSugeridos.map((nombreArtista) => (
                          <li key={nombreArtista}>
                            <button type="button" className="search-entry-button" onClick={() => abrirPerfilArtista(nombreArtista)}>
                              <strong>{nombreArtista}</strong>
                              <span>Artista</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </article>
                  )}
                </div>
              )}

              {busqueda.trim() && !cargandoBusqueda && !hayResultados && (
                <p className="search-empty">No hay resultados para esta búsqueda.</p>
              )}

              {busqueda.trim() && !cargandoBusqueda && hayResultados && (
                <div className="search-groups">
                  {resultadosBusqueda.canciones.length > 0 && (
                    <article className="search-group">
                      <h3>Canciones</h3>
                      <ul>
                        {resultadosBusqueda.canciones.map((cancion, indice) => {
                          const claveMenuPlaylist = `${cancion.id || cancion.titulo}-${cancion.artista}-${indice}`;
                          const hayMultiplesPlaylists = playlistsUsuario.length > 1;

                          return (
                          <li key={cancion.id || claveMenuPlaylist}>
                            <button type="button" className="search-result-button" onClick={() => seleccionarCancion(cancion)}>
                              <strong>{cancion.titulo}</strong>
                              <span>{cancion.artista} • {cancion.album}</span>
                            </button>
                            <div className="search-result-actions">
                              <button
                                type="button"
                                className="secondary-link-button"
                                onClick={() => alternarFavoritoCancion(cancion)}
                              >
                                {esCancionFavorita(cancion) ? "♥ Favorita" : "♡ Favorita"}
                              </button>
                              {hayMultiplesPlaylists ? (
                                <div className="search-playlist-picker">
                                  <button
                                    type="button"
                                    className="secondary-link-button"
                                    onClick={() =>
                                      setMenuAgregarPlaylistCancionId((anterior) =>
                                        anterior === claveMenuPlaylist ? null : claveMenuPlaylist
                                      )
                                    }
                                  >
                                    Agregar a playlist
                                  </button>
                                  {menuAgregarPlaylistCancionId === claveMenuPlaylist && (
                                    <div className="search-playlist-menu">
                                      {playlistsUsuario.map((playlist) => (
                                        <button
                                          key={playlist.id}
                                          type="button"
                                          className="search-playlist-menu-item"
                                          onClick={() => seleccionarPlaylistParaCancion(cancion, playlist.id)}
                                        >
                                          {playlist.nombre}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="secondary-link-button"
                                  onClick={() => agregarAPlaylist(cancion)}
                                >
                                  Agregar a playlist
                                </button>
                              )}
                            </div>
                          </li>
                          );
                        })}
                      </ul>
                    </article>
                  )}

                  {resultadosBusqueda.artistas.length > 0 && (
                    <article className="search-group">
                      <h3>Artistas</h3>
                      <ul>
                        {resultadosBusqueda.artistas.map((artista) => (
                          <li key={artista.nombre}>
                            <button type="button" className="search-entry-button" onClick={() => abrirPerfilArtista(artista.nombre)}>
                              <strong>{artista.nombre}</strong>
                              <span>Artista</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </article>
                  )}

                  {resultadosBusqueda.albums.length > 0 && (
                    <article className="search-group">
                      <h3>Álbumes</h3>
                      <ul>
                        {resultadosBusqueda.albums.map((album) => (
                          <li key={album.nombre}>
                            <button type="button" className="search-entry-button" onClick={() => seleccionarAlbum(album.nombre)}>
                              <strong>{album.nombre}</strong>
                              <span>Álbum</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </article>
                  )}
                </div>
              )}
            </section>
          )}
          </>
          )}
        </div>

        {vistaActiva === "biblioteca" ? (
          <section className="section-block library-shell">
            <div className="library-hero">
              <div
                className={obtenerClaseCover("playlist-cover", cancionActual, obtenerPortadaCancionResuelta)}
                style={obtenerEstiloCover(cancionActual, obtenerPortadaCancionResuelta)}
              ></div>
              <div className="library-hero-meta">
                <span className="section-label">TU BIBLIOTECA</span>
                <h2>{playlistActiva ? playlistActiva.nombre : "Crea tu playlist"}</h2>
                <p>
                  {playlistActiva
                    ? `${miPlaylist.length} canciones • ${Math.floor(miPlaylist.reduce((sum, c) => sum + (c.duracion || 0), 0) / 60)} min`
                    : "Sin playlist creada"}
                </p>
                <div className="library-chips">
                  <span>Playlists</span>
                  <span>Favoritas</span>
                </div>
              </div>
            </div>

            {playlistsUsuario.length > 0 && (
              <div className="library-playlist-strip">
                {playlistsUsuario.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    className={`library-playlist-pill ${playlist.id === playlistSeleccionadaId ? "active" : ""}`}
                    onClick={() => {
                      setPlaylistSeleccionadaId(playlist.id);
                      setIndiceCancionActual(0);
                    }}
                  >
                    {playlist.nombre}
                  </button>
                ))}
              </div>
            )}

            <div className="library-toolbar">
              <button
                type="button"
                className="player-button"
                onClick={() => miPlaylist.length > 0 && reproducirDesdePlaylist(0)}
                disabled={!playlistActiva || miPlaylist.length === 0}
              >
                ▶ Reproducir
              </button>

              <div className="playlist-controls-menu">
                <button
                  type="button"
                  className="secondary-link-button table-action-button"
                  onClick={abrirFormularioPlaylist}
                  aria-label="Crear playlist"
                >
                  +
                </button>
                <button
                  type="button"
                  className="secondary-link-button table-action-button"
                  onClick={() => setMenuPlaylistAbierto((anterior) => !anterior)}
                  aria-label="Más opciones"
                >
                  ...
                </button>
                {menuPlaylistAbierto && (
                  <div className="playlist-dropdown-menu">
                    <button
                      type="button"
                      className="playlist-dropdown-item"
                      onClick={eliminarPlaylistCompleta}
                      disabled={!playlistActiva}
                    >
                      Eliminar playlist
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="library-layout">
                {crearPlaylistAbierto && (
                  <form className="playlist-create-inline" onSubmit={crearPlaylist}>
                    <input
                      className="playlist-create-input"
                      type="text"
                      value={nombreNuevaPlaylist}
                      onChange={(evento) => setNombreNuevaPlaylist(evento.target.value)}
                      placeholder="Nombre de la playlist"
                      autoFocus
                    />
                    <div className="playlist-create-actions">
                      <button type="submit" className="playlist-create-confirm" disabled={!nombreNuevaPlaylist.trim()}>
                        Crear
                      </button>
                      <button type="button" className="playlist-create-cancel" onClick={cancelarCreacionPlaylist}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              {playlistActiva && (
                <article className="library-main-panel">
                  {miPlaylist.length === 0 ? (
                    <p className="search-empty">Tu playlist está vacía. Busca canciones y agrégalas.</p>
                  ) : (
                    <table className="playlist-table library-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>TÍTULO</th>
                        <th>ÁLBUM</th>
                        <th>DURACIÓN</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {miPlaylist.map((song, index) => (
                        <tr key={song.id} onClick={() => reproducirDesdePlaylist(index)}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="song-cell">
                              <div
                                className={obtenerClaseCover("mini-cover", song, obtenerPortadaCancionResuelta)}
                                style={obtenerEstiloCover(song, obtenerPortadaCancionResuelta)}
                              ></div>
                              <div>
                                <div className="song-title-row">{song.titulo}</div>
                                <div className="song-artist-row">{song.artista}</div>
                              </div>
                            </div>
                          </td>
                          <td>{song.album}</td>
                          <td>{Math.floor((song.duracion || 0) / 60)}:{String(Math.floor((song.duracion || 0) % 60)).padStart(2, "0")}</td>
                          <td>
                            <div className="song-actions-menu">
                              <button
                                type="button"
                                className="secondary-link-button table-action-button song-action-trigger"
                                aria-label="Acciones de la canción"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const claveMenu = `library-${song.id}-${index}`;
                                  setMenuAccionesCancionId((anterior) =>
                                    anterior === claveMenu ? null : claveMenu
                                  );
                                }}
                              >
                                ⋯
                              </button>

                              {menuAccionesCancionId === `library-${song.id}-${index}` && (
                                <div className="playlist-dropdown-menu song-row-dropdown">
                                  <button
                                    type="button"
                                    className="playlist-dropdown-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      alternarFavoritoCancion(song);
                                      setMenuAccionesCancionId(null);
                                    }}
                                  >
                                    {esCancionFavorita(song)
                                      ? "Quitar de favoritas"
                                      : "Agregar a favoritas"}
                                  </button>
                                  <button
                                    type="button"
                                    className="playlist-dropdown-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      eliminarDePlaylist(song.id);
                                    }}
                                  >
                                    Eliminar de playlist
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  )}
                </article>
              )}

              <aside className="library-side-panel">
                <div className="history-header">
                  <h3>Canciones favoritas</h3>
                </div>

                {errorFavoritos && <p className="form-error">{errorFavoritos}</p>}
                {cargandoFavoritos && <p className="search-empty">Cargando favoritas...</p>}

                {!cargandoFavoritos && favoritos.length === 0 && (
                  <p className="search-empty">Aún no tienes canciones favoritas.</p>
                )}

                {!cargandoFavoritos && favoritos.length > 0 && (
                  <ul className="history-list library-favorites-list">
                    {favoritos.map((favorito) => (
                      <li className="history-item library-favorite-item" key={favorito.id}>
                        <div>
                          <strong>{favorito.cancion?.titulo || "Canción desconocida"}</strong>
                          <p>{favorito.cancion?.artista || "Artista desconocido"} • {favorito.cancion?.album || "Sin álbum"}</p>
                        </div>
                        <div className="favorite-actions">
                          <button
                            type="button"
                            className="secondary-link-button table-action-button"
                            onClick={() => reproducirCancionDirecta(favorito.cancion)}
                          >
                            ▶
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => quitarDeFavoritos(favorito.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          </section>
        ) : vistaActiva === "playlist" ? (
          <section className="playlist-screen">
            <div className="playlist-header">
              <div
                className={obtenerClaseCover("playlist-cover", cancionActual, obtenerPortadaCancionResuelta)}
                style={obtenerEstiloCover(cancionActual, obtenerPortadaCancionResuelta)}
              ></div>
              <div className="playlist-meta">
                <span className="section-label">PLAYLIST</span>
                <h2>{playlistActiva?.nombre || "Mi Playlist"}</h2>
                <p>{miPlaylist.length} canciones • {Math.floor(miPlaylist.reduce((sum, c) => sum + (c.duracion || 0), 0) / 60)}min</p>
              </div>
            </div>

            <div className="playlist-actions">
              <button 
                type="button" 
                className="player-button" 
                onClick={() => miPlaylist.length > 0 && reproducirDesdePlaylist(0)}
                disabled={miPlaylist.length === 0}
              >
                ▶ Reproducir
              </button>
              <button type="button" className="secondary-link-button">⤮ Mezclar</button>
            </div>

            {miPlaylist.length === 0 ? (
              <p className="search-empty">Tu playlist está vacía. Busca canciones y agrégalas.</p>
            ) : (
              <table className="playlist-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>TÍTULO</th>
                    <th>ÁLBUM</th>
                    <th>DURACIÓN</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {miPlaylist.map((song, index) => (
                    <tr key={song.id} onClick={() => reproducirDesdePlaylist(index)}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="song-cell">
                          <div
                            className={obtenerClaseCover("mini-cover", song, obtenerPortadaCancionResuelta)}
                            style={obtenerEstiloCover(song, obtenerPortadaCancionResuelta)}
                          ></div>
                          <div>
                            <div className="song-title-row">{song.titulo}</div>
                            <div className="song-artist-row">{song.artista}</div>
                          </div>
                        </div>
                      </td>
                      <td>{song.album}</td>
                      <td>{Math.floor((song.duracion || 0) / 60)}:{String(Math.floor((song.duracion || 0) % 60)).padStart(2, "0")}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary-link-button table-action-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            alternarFavoritoCancion(song);
                          }}
                        >
                          {esCancionFavorita(song) ? "♥" : "♡"}
                        </button>
                        <button 
                          type="button" 
                          className="delete-button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarDePlaylist(song.id);
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : vistaActiva === "player" ? (
          <section className="player-screen">
            <div className="backlink" onClick={minimizarPlayer}>← Volver al inicio</div>
            <div
              className={obtenerClaseCover("player-cover", cancionActual, obtenerPortadaCancionResuelta)}
              style={obtenerEstiloCover(cancionActual, obtenerPortadaCancionResuelta)}
            ></div>
            <div className="player-title">{cancionActual.titulo}</div>
            <div className="player-artist">
              {cancionActual.artista} •{" "}
              {playlistsUsuario.length > 1 ? (
                <span className="player-add-playlist-picker">
                  <button
                    type="button"
                    className="player-add-playlist-button"
                    onClick={agregarCancionActualAPlaylist}
                  >
                    Agregar a playlist
                  </button>
                  {menuAgregarPlaylistCancionId === PLAYER_PLAYLIST_MENU_ID && (
                    <div className="search-playlist-menu player-playlist-menu">
                      {playlistsUsuario.map((playlist) => (
                        <button
                          key={playlist.id}
                          type="button"
                          className="search-playlist-menu-item"
                          onClick={() => seleccionarPlaylistParaCancion(cancionActual, playlist.id)}
                        >
                          {playlist.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  className="player-add-playlist-button"
                  onClick={agregarCancionActualAPlaylist}
                >
                  Agregar a playlist
                </button>
              )}
              <button
                type="button"
                className="secondary-link-button favorite-inline-button"
                onClick={() => alternarFavoritoCancion(cancionActual)}
              >
                {esCancionFavorita(cancionActual) ? "♥ Favorita" : "♡ Favorita"}
              </button>
            </div>
            <input
              className="player-progress-slider"
              type="range"
              min="0"
              max={duracion || 100}
              value={progreso}
              onChange={cambiarTiempo}
              aria-label="Progreso de reproducción"
            />
            <div className="player-time-row">
              <span>{Math.floor(progreso / 60)}:{String(Math.floor(progreso % 60)).padStart(2, "0")}</span>
              <span>{Math.floor(duracion / 60)}:{String(Math.floor(duracion % 60)).padStart(2, "0")}</span>
            </div>
            <div className="player-controls-row">
              <span className="player-icon-label" aria-hidden="true">⇄</span>
              <button type="button" className="control-button" onClick={cancionAnterior} disabled={indiceCancionActual === 0}>|◀</button>
              <span className="play-circle" onClick={alternarReproduccion}>{reproduciendo ? "⏸" : "▶"}</span>
              <button type="button" className="control-button" onClick={cancionSiguiente} disabled={indiceCancionActual >= miPlaylist.length - 1}>▶|</button>
              <span className="player-icon-label" aria-hidden="true">↻</span>
            </div>
            <div className="player-volume-row">
              <span className="player-icon-label player-volume-label" aria-hidden="true">VOL</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volumen}
                onChange={cambiarVolumen}
                className="volume-slider"
                aria-label="Volumen"
              />
              <span>{volumen}%</span>
            </div>
            {mensajeReproductor && (
              <p
                className={`player-message ${
                  mensajeReproductorVisible
                    ? "player-message-visible"
                    : "player-message-hidden"
                }`}
              >
                {mensajeReproductor}
              </p>
            )}
          </section>
        ) : vistaActiva === "perfil-publico" ? (
          <PerfilPublico
            perfil={perfilPublico}
            cargando={cargandoPerfilPublico}
            error={errorPerfilPublico}
            usuarioActual={usuario}
            onSeguir={seguirDesdePerfilPublico}
            onDejarDeSeguir={dejarDeSeguirDesdePerfilPublico}
            onAbrirChat={abrirChatConUsuario}
            onReproducirCancion={reproducirCancionDirecta}
            onVolver={() => cambiarVista(vistaAnteriorPerfil)}
          />
        ) : vistaActiva === "artistas" ? (
          <section className="section-block">
            <p className="section-label">Artistas disponibles</p>
            {cargandoArtistas && <p className="search-empty">Cargando artistas...</p>}
            <div className="artist-list-grid">
              {artistasCatalogo.map((artista) => (
                <article className="artist-list-card" key={artista.id || artista.nombre}>
                  <img className="artist-list-photo" src={obtenerFotoArtista(artista.foto)} alt={artista.nombre} />
                  <div className="artist-list-body">
                    <strong>{artista.nombre}</strong>
                    <span>{(artista.generos || []).join(" • ")}</span>
                    <button type="button" className="artist-profile-button" onClick={() => abrirPerfilArtista(artista.nombre)}>
                      Ver perfil público
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : vistaActiva === "social" ? (
          <Social
            usuario={usuario}
            onSesionExpirada={cerrarSesionPorExpiracion}
            conversacionInicialId={chatInicialId}
            onConversacionInicialConsumida={() => setChatInicialId(null)}
          />
        ) : vistaActiva === "perfil-artista" ? (
          <PerfilArtista usuario={usuario} onVerPerfilPublico={abrirPerfilArtista} />
        ) : vistaActiva === "mi-musica" ? (
          <GestionCanciones usuario={usuario} />
        ) : vistaActiva === "perfil" ? (
          <section className="profile-section">
            <article className="profile-card profile-hero-card artist-admin-cover-card">
              <div
                className="artist-admin-cover-preview"
                style={portadaPerfilUsuario ? { backgroundImage: `url("${portadaPerfilUsuario}")` } : undefined}
              >
                <label className="artist-admin-upload-button artist-admin-upload-button--cover">
                  {subiendoPortadaUsuario ? "Subiendo..." : "Cambiar portada"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    disabled={subiendoPortadaUsuario}
                    onChange={(event) => {
                      seleccionarImagenUsuario("portada", event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              <button
                type="button"
                className={`profile-settings-btn${mostrarConfiguracion ? " profile-settings-btn--active" : ""}`}
                onClick={() => setMostrarConfiguracion((v) => !v)}
                aria-label="Configuración de perfil"
                title="Configuración"
              >
                ⚙
              </button>
              <div className="profile-head artist-admin-identity">
                <div
                  className={`preview-avatar profile-avatar-xl artist-admin-avatar ${
                    fotoPerfilUsuario
                      ? "profile-avatar-xl--photo"
                      : ""
                  }`}
                >
                  {fotoPerfilUsuario && (
                    <img
                      src={fotoPerfilUsuario}
                      alt="Foto de perfil"
                    />
                  )}
                  <span>{usuario.nombre?.charAt(0).toUpperCase() || "U"}</span>
                  <label className="artist-admin-upload-button artist-admin-upload-button--avatar">
                    {subiendoFotoUsuario ? "..." : "Cambiar"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      disabled={subiendoFotoUsuario}
                      onChange={(event) => {
                        seleccionarImagenUsuario("foto", event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="profile-identity">
                  <p className="section-label">PERFIL</p>
                  <h2>{usuario.nombre}</h2>
                  <p>{usuario.correo}</p>
                  {usuario.biografia && <p>{usuario.biografia}</p>}
                  <button
                    type="button"
                    className="secondary-link-button"
                    onClick={() => abrirPerfilPublico({ tipo: "usuario", id: usuario.id })}
                  >
                    Ver mi perfil público
                  </button>
                  <div className="profile-meta-line">
                    <span>{usuario.rol || "Usuario"}</span>
                    <span>{resumenPerfil.reproduccionesUltimos7Dias} reproducciones en los ultimos 7 dias</span>
                  </div>
                  <div className="profile-follow-counts">
                    <button
                      type="button"
                      className={`sp-count-link profile-count-link${tabSeguidores === "seguidores" ? " profile-count-link--active" : ""}`}
                      onClick={() => { if (tabSeguidores === "seguidores") { setTabSeguidores(null); } else { setTabSeguidores("seguidores"); setOrigenComunidad("seguidores"); } }}
                    >
                      <strong>{seguidores.length}</strong> seguidores
                    </button>
                    <span className="sp-count-sep">·</span>
                    <button
                      type="button"
                      className={`sp-count-link profile-count-link${tabSeguidores === "siguiendo" ? " profile-count-link--active" : ""}`}
                      onClick={() => { if (tabSeguidores === "siguiendo") { setTabSeguidores(null); } else { setTabSeguidores("siguiendo"); setOrigenComunidad("siguiendo"); } }}
                    >
                      <strong>{siguiendo.length}</strong> siguiendo
                    </button>
                  </div>
                </div>
              </div>

              {tabSeguidores !== null && (
                <div className="sp-inline-community">
                  <div className="sp-inline-tabs">
                    <button
                      type="button"
                      className={`sp-tab-pill${tabSeguidores === "descubrir" ? " sp-tab-pill--active" : ""}`}
                      onClick={() => setTabSeguidores("descubrir")}
                    >
                      Descubrir
                    </button>
                    {origenComunidad === "seguidores" && (
                      <button
                        type="button"
                        className={`sp-tab-pill${tabSeguidores === "seguidores" ? " sp-tab-pill--active" : ""}`}
                        onClick={() => setTabSeguidores("seguidores")}
                      >
                        Te siguen
                        {seguidores.length > 0 && <span className="sp-tab-count">{seguidores.length}</span>}
                      </button>
                    )}
                    {origenComunidad === "siguiendo" && (
                      <button
                        type="button"
                        className={`sp-tab-pill${tabSeguidores === "siguiendo" ? " sp-tab-pill--active" : ""}`}
                        onClick={() => setTabSeguidores("siguiendo")}
                      >
                        Siguiendo
                        {siguiendo.length > 0 && <span className="sp-tab-count">{siguiendo.length}</span>}
                      </button>
                    )}
                    <button
                      type="button"
                      className="sp-tab-close"
                      onClick={() => setTabSeguidores(null)}
                      aria-label="Cerrar"
                    >
                      ✕
                    </button>
                  </div>

                  {tabSeguidores === "descubrir" && (
                    <div className="sp-follow-pane">
                      <input
                        className="search-box sp-follow-search"
                        type="search"
                        value={busquedaUsuariosSeguidores}
                        onChange={(event) => setBusquedaUsuariosSeguidores(event.target.value)}
                        placeholder="Busca por nombre o correo..."
                      />
                      {cargandoBusquedaSeguidores && <p className="sp-follow-empty">Buscando usuarios...</p>}
                      {!cargandoBusquedaSeguidores && busquedaUsuariosSeguidores.trim() && usuariosSugeridosSeguidores.length === 0 && (
                        <p className="sp-follow-empty">No se encontraron usuarios para esa búsqueda.</p>
                      )}
                      {!busquedaUsuariosSeguidores.trim() && (
                        <p className="sp-follow-empty">Busca por nombre o correo para empezar a seguir perfiles.</p>
                      )}
                      {!cargandoBusquedaSeguidores && usuariosSugeridosSeguidores.length > 0 && (
                        <ul className="sp-user-list">
                          {usuariosSugeridosSeguidores.map((u) => (
                            <li key={u.id} className="sp-user-row">
                              <span className="sp-avatar">{String(u.nombre || "U").charAt(0).toUpperCase()}</span>
                              <div className="sp-user-info">
                                <strong>{u.nombre}</strong>
                                <span>{u.correo}</span>
                                {u.teSigue && <small className="sp-mutual">También te sigue</small>}
                              </div>
                              {u.yaLoSigues ? (
                                <button type="button" className="sp-follow-btn sp-follow-btn--following" onClick={() => dejarDeSeguirUsuario(u.id)}>
                                  <span className="sp-btn-label sp-btn-following">Siguiendo</span>
                                  <span className="sp-btn-label sp-btn-unfollow">Dejar de seguir</span>
                                </button>
                              ) : (
                                <button type="button" className="sp-follow-btn" onClick={() => seguirUsuario(u.id)}>
                                  Seguir
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {tabSeguidores === "seguidores" && (
                    <div className="sp-follow-pane">
                      {cargandoSeguidores && <p className="sp-follow-empty">Cargando seguidores...</p>}
                      {!cargandoSeguidores && seguidores.length === 0 && <p className="sp-follow-empty">Aún no tienes seguidores.</p>}
                      {!cargandoSeguidores && seguidores.length > 0 && (
                        <ul className="sp-user-list">
                          {seguidores.map((s) => (
                            <li key={s.id} className="sp-user-row sp-user-row--clickable" onClick={() => verPerfilAmigo(s.id)} role="button" tabIndex={0}>
                              <span className="sp-avatar">{String(s.nombre || "U").charAt(0).toUpperCase()}</span>
                              <div className="sp-user-info">
                                <strong>{s.nombre || "Usuario"}</strong>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {tabSeguidores === "siguiendo" && (
                    <div className="sp-follow-pane">
                      {cargandoSeguidores && <p className="sp-follow-empty">Cargando perfiles que sigues...</p>}
                      {!cargandoSeguidores && siguiendo.length === 0 && <p className="sp-follow-empty">Aún no sigues a nadie.</p>}
                      {!cargandoSeguidores && siguiendo.length > 0 && (
                        <ul className="sp-user-list">
                          {siguiendo.map((s) => (
                            <li key={s.id} className="sp-user-row">
                              <button type="button" className="sp-user-clickable" onClick={() => verPerfilAmigo(s.id)}>
                                <span className="sp-avatar">{String(s.nombre || "U").charAt(0).toUpperCase()}</span>
                                <strong className="sp-user-name">{s.nombre}</strong>
                              </button>
                              <button type="button" className="sp-follow-btn sp-follow-btn--following" onClick={() => dejarDeSeguirUsuario(s.id)}>
                                <span className="sp-btn-label sp-btn-following">Siguiendo</span>
                                <span className="sp-btn-label sp-btn-unfollow">Dejar de seguir</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {errorSeguidores && <p className="form-error">{errorSeguidores}</p>}
                  {mensajeSeguidores && <p className="form-success">{mensajeSeguidores}</p>}
                </div>
              )}
            </article>

            <div className="profile-stats-grid">
              <article className="profile-stat-card">
                <p className="small-label">Playlists</p>
                <strong>{resumenPerfil.playlists}</strong>
              </article>
              <article className="profile-stat-card">
                <p className="small-label">Canciones guardadas</p>
                <strong>{resumenPerfil.cancionesGuardadas}</strong>
              </article>
              <article className="profile-stat-card">
                <p className="small-label">Favoritas</p>
                <strong>{resumenPerfil.favoritos}</strong>
              </article>
              <article className="profile-stat-card">
                <p className="small-label">Top artista</p>
                <strong>{resumenPerfil.topArtista}</strong>
              </article>
            </div>

            <div className="profile-layout">
              <article className="profile-card profile-activity-card">
                <div className="form-header">
                  <h3>Escuchado recientemente</h3>
                  <p>Tu actividad más reciente.</p>
                </div>

                {resumenPerfil.actividadReciente.length === 0 ? (
                  <p className="search-empty">Todavía no hay reproducciones registradas.</p>
                ) : (
                  <ul className="history-list">
                    {resumenPerfil.actividadReciente.map((registro) => (
                      <li className="history-item" key={registro.id}>
                        <div>
                          <strong>{registro.cancion?.titulo || "Canción desconocida"}</strong>
                          <p>
                            {registro.cancion?.artista || "Artista desconocido"} • {formatearFechaHistorial(registro.reproducidoEn || registro.fecha_reproduccion)}
                          </p>
                        </div>
                        <div className="favorite-actions">
                          <button
                            type="button"
                            className="secondary-link-button table-action-button"
                            onClick={() => reproducirCancionDirecta(registro.cancion)}
                          >
                            ▶
                          </button>
                          <button
                            type="button"
                            className="secondary-link-button table-action-button"
                            onClick={() => alternarFavoritoCancion(registro.cancion)}
                          >
                            {esCancionFavorita(registro.cancion) ? "♥" : "♡"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <div className="profile-side-column">
                {mostrarConfiguracion && (
                <>
                <form className="profile-card profile-form" onSubmit={guardarPerfil}>
                  <div className="form-header">
                    <h3>Editar perfil</h3>
                    <p>Actualiza tus datos públicos.</p>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Nombre completo</span>
                      <input
                        type="text"
                        name="nombre"
                        value={perfilForm.nombre}
                        onChange={actualizarCampo}
                        placeholder="Tu nombre"
                      />
                    </label>

                    <label className="field">
                      <span>Correo electrónico</span>
                      <input
                        type="email"
                        name="correo"
                        value={perfilForm.correo}
                        onChange={actualizarCampo}
                        placeholder="nombre@correo.com"
                      />
                    </label>
                  </div>

                  <label className="field artist-admin-bio-field">
                    <span>Biografía</span>
                    <textarea
                      name="biografia"
                      value={perfilForm.biografia}
                      onChange={actualizarCampo}
                      placeholder="Contales a los demás quién sos"
                      rows={4}
                      maxLength={500}
                    />
                  </label>

                  {errorPerfil && <p className="form-error">{errorPerfil}</p>}
                  {mensajePerfil && <p className="form-success">{mensajePerfil}</p>}

                  <button type="submit" className="save-button" disabled={guardandoPerfil || cargandoPerfil}>
                    {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                  </button>

                  <div className="privacy-toggle-row">
                    <div className="privacy-toggle-info">
                      <strong>Perfil privado</strong>
                      <span>Solo seguidores mutuos pueden ver tu actividad musical.</span>
                    </div>
                    <button
                      type="button"
                      className={`privacy-toggle-btn${perfilPrivado ? " privacy-toggle-btn--on" : ""}`}
                      onClick={() => cambiarPrivacidadPerfil(!perfilPrivado)}
                      aria-label={perfilPrivado ? "Desactivar perfil privado" : "Activar perfil privado"}
                    >
                      <span className="privacy-toggle-knob" />
                    </button>
                  </div>

                  <div className="privacy-toggle-row">
                    <div className="privacy-toggle-info">
                      <strong>Visualización</strong>
                      <span>Elige entre modo claro y modo oscuro.</span>
                    </div>
                    <button
                      type="button"
                      className={`privacy-toggle-btn${tema === "oscuro" ? " privacy-toggle-btn--on" : ""}`}
                      onClick={() => setTema(tema === "oscuro" ? "claro" : "oscuro")}
                      aria-label={tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                      <span className="privacy-toggle-knob" />
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  className="profile-card profile-logout-button"
                  onClick={cerrarSesion}
                >
                  Cerrar sesión
                </button>
                </>
                )}
              </div>
            </div>

            {recorteUsuario && (
              <RecortarImagenModal
                imagenUrl={recorteUsuario.urlOriginal}
                aspecto={CONFIG_RECORTE[recorteUsuario.tipo].aspecto}
                anchoSalida={CONFIG_RECORTE[recorteUsuario.tipo].anchoSalida}
                altoSalida={CONFIG_RECORTE[recorteUsuario.tipo].altoSalida}
                forma={CONFIG_RECORTE[recorteUsuario.tipo].forma}
                titulo={CONFIG_RECORTE[recorteUsuario.tipo].titulo}
                onCancelar={cerrarRecorteUsuario}
                onConfirmar={confirmarRecorteUsuario}
              />
            )}
          </section>
        ) : (
          <>
          <div className="section-block">
  <div className="section-title-row">
    <p className="section-label">
      Populares del momento
    </p>
  </div>

  {cargandoPopulares && (
    <p className="popular-status">
      Cargando canciones...
    </p>
  )}

  {!cargandoPopulares && errorPopulares && (
    <p className="popular-status popular-status--error">
      {errorPopulares}
    </p>
  )}

  {!cargandoPopulares &&
    !errorPopulares &&
    cancionesPopulares.length === 0 && (
      <p className="popular-status">
        No hay canciones disponibles en este momento.
      </p>
    )}

  {!cargandoPopulares &&
    cancionesPopulares.length > 0 && (
      <div className="tile-grid">
        {cancionesPopulares.map((cancion) => (
          <button
            type="button"
            className="tile-card popular-song-card"
            key={cancion.id}
            onClick={() =>
              reproducirCancionDirecta(cancion)
            }
          >
            <div
              className={`tile-cover ${
                cancion.portada
                  ? "tile-cover--image"
                  : ""
              }`}
              style={
                cancion.portada
                  ? {
                      backgroundImage: `url("${cancion.portada}")`,
                    }
                  : undefined
              }
            />

            <div className="tile-title">
              {cancion.titulo}
            </div>

            <div className="tile-sub">
              {cancion.artista}
            </div>

            <div className="tile-sub">
              {cancion.album || "Sin álbum"}
            </div>
          </button>
        ))}
      </div>
    )}
</div>
            <div className="section-block">
              <p className="section-label">Continuar escuchando</p>
              {cargandoHistorial && (
                <p className="popular-status">
                  Cargando tu actividad...
                </p>
              )}

              {!cargandoHistorial && cancionesContinuarEscuchando.length === 0 && (
                <p className="popular-status">
                  Reproduce canciones y aparecerán aquí.
                </p>
              )}

              {!cargandoHistorial && cancionesContinuarEscuchando.length > 0 && (
                <div className="tile-grid">
                  {cancionesContinuarEscuchando.map((cancion, indice) => (
                    <button
                      type="button"
                      className="tile-card popular-song-card"
                      key={`${cancion.titulo}-${cancion.artista}-${indice}`}
                      onClick={() => seleccionarCancion(cancion)}
                    >
                      <div
                        className={obtenerClaseCover("tile-cover", cancion, obtenerPortadaCancionResuelta)}
                        style={obtenerEstiloCover(cancion, obtenerPortadaCancionResuelta)}
                      />
                      <div className="tile-title">{cancion.titulo}</div>
                      <div className="tile-sub">{cancion.artista}</div>
                      <div className="tile-sub">{cancion.album || "Sin álbum"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="section-block">
              <p className="section-label">Recomendado para vos</p>
              {cargandoArtistas && artistasRecomendados.length === 0 && (
                <p className="popular-status">
                  Cargando recomendaciones...
                </p>
              )}

              {!cargandoArtistas && artistasRecomendados.length === 0 && (
                <p className="popular-status">
                  No hay recomendaciones disponibles por ahora.
                </p>
              )}

              {artistasRecomendados.length > 0 && (
                <div className="artist-grid">
                  {artistasRecomendados.map((artista) => (
                    <article
                      className="artist-card"
                      key={artista.id || artista.nombre}
                      onClick={() => abrirPerfilArtista(artista.nombre)}
                    >
                      <div
                        className="artist-circle artist-circle--image"
                        style={{
                          backgroundImage: `url("${obtenerFotoArtista(artista.foto)}")`,
                        }}
                      />
                      <span>{artista.nombre}</span>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="section-block">
              <p className="section-label">Artistas populares</p>
              {cargandoPopulares && artistasPopularesInicio.length === 0 && (
                <p className="popular-status">
                  Cargando artistas populares...
                </p>
              )}

              {!cargandoPopulares && artistasPopularesInicio.length === 0 && (
                <p className="popular-status">
                  No hay artistas populares para mostrar.
                </p>
              )}

              {artistasPopularesInicio.length > 0 && (
                <div className="artist-grid">
                  {artistasPopularesInicio.map((artista) => (
                    <article
                      className="artist-card"
                      key={`popular-${artista.id || artista.nombre}`}
                      onClick={() => abrirPerfilArtista(artista.nombre)}
                    >
                      <div
                        className="artist-circle artist-circle--image"
                        style={{
                          backgroundImage: `url("${obtenerFotoArtista(artista.foto)}")`,
                        }}
                      />
                      <span>{artista.nombre}</span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {miniPlayerVisible && vistaActiva !== "player" && (
          <>
            <div className="mini-player">
              <div className="mini-player-main" onClick={abrirPlayer}>
                <div
                  className={obtenerClaseCover("mini-player-cover", cancionActual, obtenerPortadaCancionResuelta)}
                  style={obtenerEstiloCover(cancionActual, obtenerPortadaCancionResuelta)}
                ></div>
                <div className="mini-player-info">
                  <strong>{cancionActual.titulo}</strong>
                  <span>{cancionActual.artista}</span>
                </div>
              </div>

              <div className="mini-player-controls">
                <span className="mini-separator" aria-hidden="true">|</span>
                <button
                  type="button"
                  className="mini-icon-button"
                  onClick={cancionAnterior}
                  disabled={indiceCancionActual === 0}
                  aria-label="Canción anterior"
                >
                  ◀◀
                </button>
                <button type="button" className="mini-icon-button" onClick={alternarReproduccion} aria-label="Reproducir o pausar">
                  {reproduciendo ? "❚❚" : "▶"}
                </button>
                <button
                  type="button"
                  className="mini-icon-button"
                  onClick={cancionSiguiente}
                  disabled={indiceCancionActual >= miPlaylist.length - 1}
                  aria-label="Canción siguiente"
                >
                  ▶▶
                </button>
                <button
                  type="button"
                  className="mini-icon-button"
                  onClick={() => alternarFavoritoCancion(cancionActual)}
                  aria-label="Alternar favorito"
                >
                  {esCancionFavorita(cancionActual) ? "♥" : "♡"}
                </button>
                <span className="mini-separator" aria-hidden="true">|</span>

                <label className="mini-player-volume" htmlFor="mini-player-volume">
                  VOL
                </label>
                <input
                  id="mini-player-volume"
                  className="volume-slider mini-volume-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={volumen}
                  onChange={cambiarVolumen}
                  aria-label="Volumen"
                />
              </div>
            </div>
            {mensajeReproductor && (
              <p
                className={`player-message ${
                  mensajeReproductorVisible
                    ? "player-message-visible"
                    : "player-message-hidden"
                }`}
              >
                {mensajeReproductor}
              </p>
            )}
          </>
        )}
        <audio ref={audioRef} src={cancionActual.audioUrl} preload="metadata" />
      </section>
    </main>
  );
}

export default App;