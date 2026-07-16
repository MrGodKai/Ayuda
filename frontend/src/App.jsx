import { useEffect, useState } from "react";
import "./App.css";
import Login from "./components/Login";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const playlistsMock = [
  { titulo: "Por definir", descripcion: "Por definir", color: "#fdfdfd" },
  { titulo: "Por definir", descripcion: "Por definir", color: "#f5f5f5" },
  { titulo: "Por definir", descripcion: "Por definir", color: "#ffffff" },
];

const artistasMock = [
  "1",
  "2",
  "3",
  "4",
  
];

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
          <button type="button" className="sidebar-link">
            Buscar
          </button>
          <button type="button" className="sidebar-link">
            Tu biblioteca
          </button>
          <button type="button" className="sidebar-link">
            Playlists
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
          <div className="search-box">Buscar canciones, artistas o playlists...</div>
          <button type="button" className="top-avatar">{usuario.nombre?.charAt(0).toUpperCase() || "U"}</button>
        </header>

        {vistaActiva === "perfil" ? (
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
                  <article className="tile-card" key={playlist.titulo}>
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

            <div className="mini-player">
              <div className="mini-player-cover"></div>
              <div className="mini-player-info">
                <strong>Nombre de la canción</strong>
                <span>Artista</span>
              </div>
              <div className="mini-player-controls">| ◀◀ ▶ ▶▶ |</div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default App;