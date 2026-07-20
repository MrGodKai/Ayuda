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
  const usuarioGuardado = sessionStorage.getItem("usuario");

  if (!usuarioGuardado) {
    return null;
  }

  try {
    return JSON.parse(usuarioGuardado);
  } catch {
    sessionStorage.removeItem("usuario");
    return null;
  }
}

function App() {
  const [usuario, setUsuario] = useState(obtenerUsuarioGuardado);
  const [vistaActiva, setVistaActiva] = useState("inicio");
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
  const [miPlaylist, setMiPlaylist] = useState([]);
  const [mensajeReproductor, setMensajeReproductor] = useState("");
  const audioRef = useRef(null);

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

  const cargarPerfil = async () => {
    const token = sessionStorage.getItem("token");

    if (!token || !usuario) {
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
    setVistaActiva(nuevaVista);
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

  const seleccionarCancion = (cancion) => {
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
  };

  const abrirPerfilArtista = async (artistaNombre) => {
    try {
      setCargandoArtistas(true);
      const respuesta = await fetch(`${API_URL}/artistas/${encodeURIComponent(artistaNombre)}`);
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo abrir el perfil del artista.");
      }

      setArtistaSeleccionado(datos.artista || null);
      setBusqueda("");
      setVistaActiva("artista");
    } catch {
      const artista = artistasCatalogo.find((item) => item.nombre === artistaNombre);
      setArtistaSeleccionado(artista || null);
      setBusqueda("");
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
      setMensajeReproductor("No se pudo reproducir la canción seleccionada.");
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
      setMensajeReproductor("La reproducción no está disponible en este momento.");
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
      setMensajeReproductor("");
    } catch {
      setReproduciendo(false);
      setMensajeReproductor("No se pudo iniciar la reproducción. Intente otra canción.");
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

  const agregarAPlaylist = (cancion) => {
    const yaExiste = miPlaylist.some((c) => c.id === cancion.id);
    if (!yaExiste) {
      setMiPlaylist([...miPlaylist, cancion]);
      setBusqueda("");
    }
  };

  const eliminarDePlaylist = (cancionId) => {
    setMiPlaylist(miPlaylist.filter((c) => c.id !== cancionId));
  };

  const reproducirDesdePlaylist = (index) => {
    if (miPlaylist[index]) {
      setIndiceCancionActual(index);
      seleccionarCancion(miPlaylist[index]);
      setReproduciendo(false);
      setBusqueda("");
      cambiarVista("player");
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

  const cerrarSesion = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    setUsuario(null);
    setMensajePerfil("");
    setErrorPerfil("");
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
          <button type="button" className="sidebar-link">
            Tu biblioteca
          </button>
          <button
            type="button"
            className={`sidebar-link ${vistaActiva === "playlist" ? "active" : ""}`}
            onClick={() => cambiarVista("playlist")}
          >
            Playlists
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
        <header className="topbar">
          <div className="logo-pill">iStream</div>
          <input
            className="search-box"
            type="search"
            placeholder="Buscar canciones, artistas o álbumes..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <button type="button" className="top-avatar">{usuario.nombre?.charAt(0).toUpperCase() || "U"}</button>
        </header>

        {busqueda.trim() && (
          <section className="search-results-panel">
            <div className="search-results-header">
              <span>Resultados para “{busqueda.trim()}”</span>
              {cargandoBusqueda && <span className="search-loading">Buscando...</span>}
            </div>

            {!cargandoBusqueda && !hayResultados && (
              <p className="search-empty">No hay resultados para esta búsqueda.</p>
            )}

            {!cargandoBusqueda && hayResultados && (
              <div className="search-groups">
                {resultadosBusqueda.canciones.length > 0 && (
                  <article className="search-group">
                    <h3>Canciones</h3>
                    <ul>
                      {resultadosBusqueda.canciones.map((cancion) => (
                        <li key={cancion.id}>
                          <button type="button" className="search-result-button" onClick={() => seleccionarCancion(cancion)}>
                            <strong>{cancion.titulo}</strong>
                            <span>{cancion.artista} • {cancion.album}</span>
                          </button>
                          <div className="search-result-actions">
                            <button type="button" className="secondary-link-button" onClick={() => agregarAPlaylist(cancion)}>
                              + Playlist
                            </button>
                            <button type="button" className="secondary-link-button" onClick={() => abrirPerfilArtista(cancion.artista)}>
                              Ver perfil
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                )}

                {resultadosBusqueda.artistas.length > 0 && (
                  <article className="search-group">
                    <h3>Artistas</h3>
                    <ul>
                      {resultadosBusqueda.artistas.map((artista) => (
                        <li key={artista.nombre}>
                          <strong>{artista.nombre}</strong>
                          <span>Artista</span>
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
                          <strong>{album.nombre}</strong>
                          <span>Álbum</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                )}
              </div>
            )}
          </section>
        )}

        {vistaActiva === "playlist" ? (
          <section className="playlist-screen">
            <div className="playlist-header">
              <div className="playlist-cover"></div>
              <div className="playlist-meta">
                <span className="section-label">PLAYLIST</span>
                <h2>Mi Playlist</h2>
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
            <div className="backlink" onClick={() => cambiarVista("inicio")}>← Volver a Inicio | Reproduciendo desde: Playlist</div>
            <div className="player-cover"></div>
            <div className="player-title">{cancionActual.titulo}</div>
            <div className="player-artist">{cancionActual.artista} • <span>Agregar a playlist</span></div>
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
              <span>🔀</span>
              <button type="button" className="control-button" onClick={cancionAnterior} disabled={indiceCancionActual === 0}>|◀</button>
              <span className="play-circle" onClick={alternarReproduccion}>{reproduciendo ? "⏸" : "▶"}</span>
              <button type="button" className="control-button" onClick={cancionSiguiente} disabled={indiceCancionActual >= miPlaylist.length - 1}>▶|</button>
              <span>🔃</span>
            </div>
            <div className="player-volume-row">
              <span>🔊</span>
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
            {mensajeReproductor && <p className="player-error">{mensajeReproductor}</p>}
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
            <div className="profile-layout">
              <article className="profile-card profile-preview">
                <div className="profile-head">
                  <div className="preview-avatar">
                    <span>{usuario.nombre?.charAt(0).toUpperCase() || "U"}</span>
                  </div>
                  <div>
                    <h3>{usuario.nombre}</h3>
                    <p>{usuario.correo}</p>
                  </div>
                </div>

                <div className="profile-stats">
                  <span>{usuario.ciudad || "Sin ciudad"}</span>
                  <span>{usuario.rol || "Usuario"}</span>
                </div>
              </article>

              <form className="profile-card profile-form" onSubmit={guardarPerfil}>
                <div className="form-header">
                  <h3>Editar perfil</h3>
                  <p>Actualiza tus datos de forma simple y ordenada.</p>
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

            <div className="mini-player">
              <div className="mini-player-cover"></div>
              <div className="mini-player-info">
                <strong>{cancionActual.titulo}</strong>
                <span>{cancionActual.artista} • {cancionActual.album}</span>
              </div>
              <div className="mini-player-controls">
                <button type="button" className="player-button" onClick={alternarReproduccion}>
                  {reproduciendo ? "Pause" : "Play"}
                </button>
                <input
                  className="player-progress"
                  type="range"
                  min="0"
                  max={duracion || 100}
                  value={progreso}
                  onChange={cambiarTiempo}
                  aria-label="Progreso de reproducción"
                />
                <span className="player-time">
                  {Math.floor(progreso / 60)}:{String(Math.floor(progreso % 60)).padStart(2, "0")}
                </span>
              </div>
            </div>
            {mensajeReproductor && <p className="player-error">{mensajeReproductor}</p>}
          </>
        )}
        <audio ref={audioRef} src={cancionActual.audioUrl} preload="metadata" />
      </section>
    </main>
  );
}

export default App;