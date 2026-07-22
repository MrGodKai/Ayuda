import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import Login from "./components/Login";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const AUDIO_SAMPLES = [
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
];

const playlistsMock = [
  { titulo: "Por definir", descripcion: "Por definir", color: "#fdfdfd" },
  { titulo: "Por definir", descripcion: "Por definir", color: "#f5f5f5" },
  { titulo: "Por definir", descripcion: "Por definir", color: "#ffffff" },
];

const playlistSongsMock = [
  { id: 1, titulo: "Canción Uno", artista: "Artista A", album: "Álbum A", duracion: "3:12" },
  { id: 2, titulo: "Canción Dos", artista: "Artista B", album: "Álbum B", duracion: "4:01" },
  { id: 3, titulo: "Canción Tres", artista: "Artista C", album: "Álbum C", duracion: "2:48" },
  { id: 4, titulo: "Canción Cuatro", artista: "Artista D", album: "Álbum D", duracion: "3:35" },
  { id: 5, titulo: "Canción Cinco", artista: "Artista E", album: "Álbum E", duracion: "3:59" },
];

const artistasMock = ["1", "2", "3", "4", "5"];

const artistasCatalogo = [];

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

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioGuardado);
  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [perfilForm, setPerfilForm] = useState({
    nombre: "",
    correo: "",
    ciudad: "",
  });
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState("");
  const [errorPerfil, setErrorPerfil] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState({
    canciones: [],
    artistas: [],
    albums: [],
    mensaje: "",
  });
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [cargandoArtistas, setCargandoArtistas] = useState(false);
  const [artistasCatalogo, setArtistasCatalogo] = useState([]);
  const [artistaSeleccionado, setArtistaSeleccionado] = useState(null);
  const [cancionActual, setCancionActual] = useState({
    id: 1,
    titulo: "Midnight City",
    artista: "M83",
    album: "Hurry Up, We're Dreaming",
    audioUrl: AUDIO_SAMPLES[0],
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
  const [mensajeReproductor, setMensajeReproductor] = useState("");
  const [tipoMensajeReproductor, setTipoMensajeReproductor] = useState("error");
  const [historialReproducciones, setHistorialReproducciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [limpiandoHistorial, setLimpiandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [cargandoFavoritos, setCargandoFavoritos] = useState(false);
  const [errorFavoritos, setErrorFavoritos] = useState("");
  const [recientesBusqueda, setRecientesBusqueda] = useState({
    canciones: [],
    artistas: [],
  });
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

  const resumenPerfil = useMemo(() => {
    const totalCancionesEnPlaylists = playlistsUsuario.reduce(
      (acumulado, playlist) => acumulado + (playlist.canciones?.length || 0),
      0
    );

    const reproduccionesUltimos7Dias = historialReproducciones.filter((registro) => {
      if (!registro?.fecha_reproduccion) {
        return false;
      }

      const fecha = new Date(registro.fecha_reproduccion);

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
  };

  const limpiarMensajeReproductor = () => {
    setMensajeReproductor("");
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

  const limpiarRecientesBusqueda = () => {
    setRecientesBusqueda({ canciones: [], artistas: [] });

    if (claveRecientesBusqueda) {
      localStorage.removeItem(claveRecientesBusqueda);
    }
  };

  const sincronizarFormulario = (usuarioActual) => {
    setPerfilForm({
      nombre: usuarioActual?.nombre || "",
      correo: usuarioActual?.correo || "",
      ciudad: usuarioActual?.ciudad || "",
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
    const cargarArtistas = async () => {
      try {
        setCargandoArtistas(true);
        const respuesta = await fetch(`${API_URL}/artistas`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No se pudo cargar el catálogo.");
        }

        setArtistasCatalogo(datos.artistas || []);
        setArtistaSeleccionado(datos.artistas?.[0] || null);
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

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo cargar el historial.");
      }

      setHistorialReproducciones(datos.historial || []);
    } catch (error) {
      setErrorHistorial(error.message || "No se pudo cargar el historial.");
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
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudieron cargar tus favoritos.");
      }

      setFavoritos(datos.favoritos || []);
    } catch (error) {
      setErrorFavoritos(error.message || "No se pudieron cargar tus favoritos.");
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

      const datos = await respuesta.json();

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
      setErrorFavoritos(error.message || "No se pudo guardar en favoritos.");
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

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo quitar de favoritos.");
      }

      setFavoritos((anterior) => anterior.filter((item) => item.id !== idFavorito));
    } catch (error) {
      setErrorFavoritos(error.message || "No se pudo quitar de favoritos.");
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

      const datos = await respuesta.json();

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
        const datos = await respuesta.json();
        throw new Error(datos.mensaje || "No se pudo eliminar el registro.");
      }

      setHistorialReproducciones((anterior) => anterior.filter((item) => item.id !== idRegistro));
    } catch (error) {
      setErrorHistorial(error.message || "No se pudo eliminar el registro.");
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

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo limpiar el historial.");
      }

      setHistorialReproducciones([]);
    } catch (error) {
      setErrorHistorial(error.message || "No se pudo limpiar el historial.");
    } finally {
      setLimpiandoHistorial(false);
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

    const timeoutId = setTimeout(() => {
      limpiarMensajeReproductor();
    }, 3200);

    return () => clearTimeout(timeoutId);
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

      const datos = await respuesta.json();

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
        throw new Error(datos.mensaje || "No se pudo cargar el perfil.");
      }

      const usuarioActualizado = {
        ...usuario,
        ...datos.usuario,
      };

      sessionStorage.setItem("usuario", JSON.stringify(usuarioActualizado));
      setUsuario(usuarioActualizado);
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
  fotoPerfil: usuario?.fotoPerfil ?? null,
  telefono: usuario?.telefono ?? null,
}),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar el perfil.");
      }

      const usuarioActualizado = {
        ...usuario,
        nombre: perfilForm.nombre.trim(),
        correo: perfilForm.correo.trim(),
        ciudad: perfilForm.ciudad.trim(),
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
        const datos = await respuesta.json();

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
    const audioUrl = cancion.audioUrl || AUDIO_SAMPLES[(cancion.id || 1) % AUDIO_SAMPLES.length];
    setCancionActual({
      id: cancion.id || Math.random(),
      titulo: cancion.titulo || "Canción desconocida",
      artista: cancion.artista || "Artista desconocido",
      album: cancion.album || "Álbum desconocido",
      audioUrl: audioUrl,
      duracion: cancion.duracion || 0,
    });
    setMensajeReproductor("");
    setReproduciendo(false);
    setProgreso(0);
    setBusqueda("");
    setBusquedaAbierta(false);
    abrirPlayer();
  };

  const abrirPerfilArtista = async (artistaNombre) => {
    registrarArtistaReciente(artistaNombre);
    try {
      setCargandoArtistas(true);
      const respuesta = await fetch(`${API_URL}/artistas/${encodeURIComponent(artistaNombre)}`);
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo abrir el perfil del artista.");
      }

      setArtistaSeleccionado(datos.artista || null);
      setBusqueda("");
      setBusquedaAbierta(false);
      setVistaActiva("artista");
    } catch {
      const artista = artistasCatalogo.find((item) => item.nombre === artistaNombre);
      setArtistaSeleccionado(artista || null);
      setBusqueda("");
      setBusquedaAbierta(false);
      setVistaActiva("artista");
    } finally {
      setCargandoArtistas(false);
    }
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

  const crearPlaylist = () => {
    const nuevaPlaylist = {
      id: `playlist-${Date.now()}`,
      nombre: `Mi playlist ${playlistsUsuario.length + 1}`,
      canciones: [],
    };

    setPlaylistsUsuario((anterior) => [...anterior, nuevaPlaylist]);
    setPlaylistSeleccionadaId(nuevaPlaylist.id);
    setMenuPlaylistAbierto(false);
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
    setMiniPlayerVisible(false);
    setHistorialReproducciones([]);
    setErrorHistorial("");
    setFavoritos([]);
    setErrorFavoritos("");
    setPlaylistsUsuario([]);
    setPlaylistSeleccionadaId(null);
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
          <button type="button" className="sidebar-link">
            Amigos
          </button>
          <button
            type="button"
            className={`sidebar-link ${vistaActiva === "perfil" ? "active" : ""}`}
            onClick={() => cambiarVista("perfil")}
          >
            Perfil
          </button>
          <button type="button" className="logout-button" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </nav>
      </aside>

      <section className="content-area" id={vistaActiva === "perfil" ? "perfil" : "inicio"}>
        <div className="search-area" ref={searchAreaRef}>
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
            <button type="button" className="top-avatar">{usuario.nombre?.charAt(0).toUpperCase() || "U"}</button>
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
        </div>

        {vistaActiva === "biblioteca" ? (
          <section className="section-block library-shell">
            <div className="library-hero">
              <div className="playlist-cover"></div>
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
                  onClick={crearPlaylist}
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
              <article className="library-main-panel">
                {!playlistActiva ? (
                  <p className="search-empty">No hay playlist creada. Presiona + para crear una.</p>
                ) : miPlaylist.length === 0 ? (
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
                              <div className="mini-cover"></div>
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>

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
              <div className="playlist-cover"></div>
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
                          <div className="mini-cover"></div>
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
            <div className="player-cover"></div>
            <div className="player-title">{cancionActual.titulo}</div>
            <div className="player-artist">
              {cancionActual.artista} • <span>Agregar a playlist</span>
              <button
                type="button"
                className="secondary-link-button favorite-inline-button"
                onClick={() => alternarFavoritoCancion(cancionActual)}
              >
                {esCancionFavorita(cancionActual) ? "♥ Favorita" : "♡ Favorita"}
              </button>
            </div>
            <div className="player-progress-line">
              <div className="player-progress-bar" style={{ width: duracion > 0 ? `${(progreso / duracion) * 100}%` : "0%" }}></div>
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
            {mensajeReproductor && <p className={tipoMensajeReproductor === "success" ? "player-success" : "player-error"}>{mensajeReproductor}</p>}
          </section>
        ) : vistaActiva === "artista" ? (
          <section className="artist-profile-section">
            <div className="artist-profile-card">
              {cargandoArtistas && <p className="search-empty">Cargando perfil del artista...</p>}
              {artistaSeleccionado && (
                <>
                  <div className="artist-profile-header">
                    <img
                      className="artist-photo"
                      src={artistaSeleccionado.foto}
                      alt={artistaSeleccionado.nombre}
                    />
                    <div>
                      <p className="section-label">Perfil público</p>
                      <h2>{artistaSeleccionado.nombre}</h2>
                      <p>{artistaSeleccionado.biografia}</p>
                    </div>
                  </div>

                  <div className="artist-profile-grid">
                    <article className="artist-detail-card">
                      <h3>Géneros musicales</h3>
                      <div className="tag-list">
                        {(artistaSeleccionado.generos || []).map((genero) => (
                          <span key={genero} className="tag-pill">{genero}</span>
                        ))}
                      </div>
                    </article>

                    <article className="artist-detail-card">
                      <h3>Álbumes</h3>
                      <ul>
                        {(artistaSeleccionado.albums || []).map((album) => (
                          <li key={album}>{album}</li>
                        ))}
                      </ul>
                    </article>

                    <article className="artist-detail-card">
                      <h3>Canciones publicadas</h3>
                      <ul>
                        {(artistaSeleccionado.canciones || []).map((cancion) => (
                          <li key={cancion}>{cancion}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : vistaActiva === "artistas" ? (
          <section className="section-block">
            <p className="section-label">Artistas disponibles</p>
            {cargandoArtistas && <p className="search-empty">Cargando artistas...</p>}
            <div className="artist-list-grid">
              {artistasCatalogo.map((artista) => (
                <article className="artist-list-card" key={artista.id || artista.nombre}>
                  <img className="artist-list-photo" src={artista.foto} alt={artista.nombre} />
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
        ) : vistaActiva === "perfil" ? (
          <section className="profile-section">
            <article className="profile-card profile-hero-card">
              <div className="profile-head">
                <div className="preview-avatar profile-avatar-xl">
                  <span>{usuario.nombre?.charAt(0).toUpperCase() || "U"}</span>
                </div>
                <div className="profile-identity">
                  <p className="section-label">PERFIL</p>
                  <h2>{usuario.nombre}</h2>
                  <p>{usuario.correo}</p>
                  <div className="profile-meta-line">
                    <span>{usuario.ciudad || "Sin ciudad"}</span>
                    <span>{usuario.rol || "Usuario"}</span>
                    <span>{resumenPerfil.reproduccionesUltimos7Dias} reproducciones esta semana</span>
                  </div>
                </div>
              </div>
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
                            {registro.cancion?.artista || "Artista desconocido"} • {formatearFechaHistorial(registro.fecha_reproduccion)}
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

                  <label className="field full-width">
                    <span>Ciudad</span>
                    <input
                      type="text"
                      name="ciudad"
                      value={perfilForm.ciudad}
                      onChange={actualizarCampo}
                      placeholder="Tu ciudad"
                    />
                  </label>
                </div>

                {errorPerfil && <p className="form-error">{errorPerfil}</p>}
                {mensajePerfil && <p className="form-success">{mensajePerfil}</p>}

                <button type="submit" className="save-button" disabled={guardandoPerfil || cargandoPerfil}>
                  {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <>
            <div className="section-block">
              <p className="section-label">Continuar escuchando</p>
              <div className="tile-grid">
                {playlistsMock.map((playlist) => (
                  <article className="tile-card" key={playlist.titulo} onClick={() => cambiarVista("player")}>
                    <div className="tile-cover" style={{ background: playlist.color }}>
                      ♫
                    </div>
                    <div className="tile-title">{playlist.titulo}</div>
                    <div className="tile-sub">{playlist.descripcion}</div>
                  </article>
                ))}
              </div>
            </div>

            <div className="section-block">
              <p className="section-label">Recomendado para vos</p>
              <div className="artist-grid">
                {artistasMock.map((artista) => (
                  <article className="artist-card" key={artista}>
                    <div className="artist-circle"></div>
                    <span>{artista}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="section-block">
              <p className="section-label">Artistas populares</p>
              <div className="artist-grid">
                {artistasMock.map((artista) => (
                  <article className="artist-card" key={`popular-${artista}`}>
                    <div className="artist-circle"></div>
                    <span>Artista {artista}</span>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}

        {miniPlayerVisible && vistaActiva !== "player" && (
          <>
            <div className="mini-player">
              <div className="mini-player-main" onClick={abrirPlayer}>
                <div className="mini-player-cover"></div>
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
            {mensajeReproductor && <p className={tipoMensajeReproductor === "success" ? "player-success" : "player-error"}>{mensajeReproductor}</p>}
          </>
        )}
        <audio ref={audioRef} src={cancionActual.audioUrl} preload="metadata" />
      </section>
    </main>
  );
}

export default App;