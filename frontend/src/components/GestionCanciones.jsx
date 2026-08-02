import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const FORMULARIO_VACIO = { titulo: "", album: "", genero: "", descripcion: "" };

const FORMATOS_AUDIO_PERMITIDOS = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
];

const FORMATOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO_AUDIO = 20 * 1024 * 1024;

function calcularDuracionAudio(archivo) {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const url = URL.createObjectURL(archivo);

      const limpiar = () => URL.revokeObjectURL(url);

      audio.addEventListener("loadedmetadata", () => {
        const duracion = Number.isFinite(audio.duration)
          ? Math.round(audio.duration)
          : null;

        limpiar();
        resolve(duracion);
      });

      audio.addEventListener("error", () => {
        limpiar();
        resolve(null);
      });

      audio.src = url;
    } catch {
      resolve(null);
    }
  });
}

function GestionCanciones({ usuario }) {
  const [canciones, setCanciones] = useState([]);
  const [generosDisponibles, setGenerosDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [publicando, setPublicando] = useState(false);

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [archivoAudio, setArchivoAudio] = useState(null);
  const [archivoPortada, setArchivoPortada] = useState(null);

  const [cancionEnEdicion, setCancionEnEdicion] = useState(null);
  const [formularioEdicion, setFormularioEdicion] = useState(FORMULARIO_VACIO);
  const [archivoAudioEdicion, setArchivoAudioEdicion] = useState(null);
  const [archivoPortadaEdicion, setArchivoPortadaEdicion] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const inputAudioRef = useRef(null);
  const inputPortadaRef = useRef(null);

  const cargarDatos = async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setMensajeError("Debe iniciar sesión nuevamente.");
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setMensajeError("");

      const [respuestaCanciones, respuestaGeneros] = await Promise.all([
        fetch(`${API_URL}/canciones/mis-canciones`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/artistas/generos-disponibles`),
      ]);

      const datosCanciones = await respuestaCanciones.json();
      const datosGeneros = await respuestaGeneros.json();

      if (!respuestaCanciones.ok) {
        throw new Error(datosCanciones.mensaje || "No se pudieron cargar tus canciones.");
      }

      setCanciones(datosCanciones.canciones || []);
      setGenerosDisponibles(datosGeneros.generos || []);
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setFormulario((anterior) => ({ ...anterior, [name]: value }));
  };

  const validarArchivoAudio = (archivo) => {
    if (!FORMATOS_AUDIO_PERMITIDOS.includes(archivo.type)) {
      return "El archivo de audio debe ser MP3, WAV, OGG o M4A.";
    }

    if (archivo.size > TAMANO_MAXIMO_AUDIO) {
      return "El archivo de audio no puede superar 20MB.";
    }

    return null;
  };

  const validarArchivoPortada = (archivo) => {
    if (!FORMATOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      return "La portada debe ser una imagen JPG, PNG o WEBP.";
    }

    return null;
  };

  const validarPublicacion = () => {
    if (!formulario.titulo.trim()) {
      setMensajeError("El título es obligatorio.");
      return false;
    }

    if (!formulario.genero) {
      setMensajeError("Debe seleccionar un género musical.");
      return false;
    }

    if (!archivoAudio) {
      setMensajeError("Debe adjuntar un archivo de audio.");
      return false;
    }

    const errorAudio = validarArchivoAudio(archivoAudio);
    if (errorAudio) {
      setMensajeError(errorAudio);
      return false;
    }

    if (archivoPortada) {
      const errorPortada = validarArchivoPortada(archivoPortada);
      if (errorPortada) {
        setMensajeError(errorPortada);
        return false;
      }
    }

    return true;
  };

  const publicarCancion = async (event) => {
    event.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!validarPublicacion()) {
      return;
    }

    try {
      setPublicando(true);
      const token = sessionStorage.getItem("token");
      const duracionSegundos = await calcularDuracionAudio(archivoAudio);

      const cuerpo = new FormData();
      cuerpo.append("titulo", formulario.titulo.trim());
      cuerpo.append("album", formulario.album.trim());
      cuerpo.append("genero", formulario.genero);
      cuerpo.append("descripcion", formulario.descripcion.trim());

      if (duracionSegundos) {
        cuerpo.append("duracionSegundos", String(duracionSegundos));
      }

      cuerpo.append("audio", archivoAudio);

      if (archivoPortada) {
        cuerpo.append("portada", archivoPortada);
      }

      const respuesta = await fetch(`${API_URL}/canciones`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: cuerpo,
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo publicar la canción.");
      }

      setCanciones((anteriores) => [datos.cancion, ...anteriores]);
      setMensajeExito(datos.mensaje || "Canción publicada correctamente.");
      setFormulario(FORMULARIO_VACIO);
      setArchivoAudio(null);
      setArchivoPortada(null);

      if (inputAudioRef.current) inputAudioRef.current.value = "";
      if (inputPortadaRef.current) inputPortadaRef.current.value = "";
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setPublicando(false);
    }
  };

  const iniciarEdicion = (cancion) => {
    setCancionEnEdicion(cancion.id);
    setFormularioEdicion({
      titulo: cancion.titulo || "",
      album: cancion.album || "",
      genero: cancion.genero || "",
      descripcion: cancion.descripcion || "",
    });
    setArchivoAudioEdicion(null);
    setArchivoPortadaEdicion(null);
    setMensajeError("");
    setMensajeExito("");
  };

  const cancelarEdicion = () => {
    setCancionEnEdicion(null);
  };

  const actualizarCampoEdicion = (event) => {
    const { name, value } = event.target;
    setFormularioEdicion((anterior) => ({ ...anterior, [name]: value }));
  };

  const guardarEdicion = async (event, idCancion) => {
    event.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!formularioEdicion.titulo.trim()) {
      setMensajeError("El título es obligatorio.");
      return;
    }

    if (!formularioEdicion.genero) {
      setMensajeError("Debe seleccionar un género musical.");
      return;
    }

    if (archivoAudioEdicion) {
      const errorAudio = validarArchivoAudio(archivoAudioEdicion);
      if (errorAudio) {
        setMensajeError(errorAudio);
        return;
      }
    }

    if (archivoPortadaEdicion) {
      const errorPortada = validarArchivoPortada(archivoPortadaEdicion);
      if (errorPortada) {
        setMensajeError(errorPortada);
        return;
      }
    }

    try {
      setGuardandoEdicion(true);
      const token = sessionStorage.getItem("token");

      let duracionSegundos = null;
      if (archivoAudioEdicion) {
        duracionSegundos = await calcularDuracionAudio(archivoAudioEdicion);
      }

      const cuerpo = new FormData();
      cuerpo.append("titulo", formularioEdicion.titulo.trim());
      cuerpo.append("album", formularioEdicion.album.trim());
      cuerpo.append("genero", formularioEdicion.genero);
      cuerpo.append("descripcion", formularioEdicion.descripcion.trim());

      if (duracionSegundos) {
        cuerpo.append("duracionSegundos", String(duracionSegundos));
      }

      if (archivoAudioEdicion) {
        cuerpo.append("audio", archivoAudioEdicion);
      }

      if (archivoPortadaEdicion) {
        cuerpo.append("portada", archivoPortadaEdicion);
      }

      const respuesta = await fetch(`${API_URL}/canciones/${idCancion}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: cuerpo,
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo actualizar la canción.");
      }

      setCanciones((anteriores) =>
        anteriores.map((item) => (item.id === idCancion ? datos.cancion : item))
      );
      setMensajeExito(datos.mensaje || "Canción actualizada correctamente.");
      setCancionEnEdicion(null);
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarCancion = async (cancion) => {
    const confirmado = window.confirm(
      `¿Eliminar "${cancion.titulo}" de tu catálogo?`
    );

    if (!confirmado) {
      return;
    }

    setMensajeError("");
    setMensajeExito("");

    try {
      const token = sessionStorage.getItem("token");

      const respuesta = await fetch(`${API_URL}/canciones/${cancion.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo eliminar la canción.");
      }

      setCanciones((anteriores) => anteriores.filter((item) => item.id !== cancion.id));
      setMensajeExito(datos.mensaje || "Canción eliminada correctamente.");
    } catch (error) {
      setMensajeError(error.message);
    }
  };

  if (usuario?.rol !== "artista") {
    return (
      <section className="profile-section">
        <article className="profile-card">
          <p>Esta sección solo está disponible para cuentas de artista.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="profile-section music-admin-section">
      <form className="profile-card profile-form" onSubmit={publicarCancion}>
        <div className="form-header">
          <h3>Publicar una nueva canción</h3>
          <p>Sube el archivo de audio y los datos de tu canción para agregarla al catálogo de iStream.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Título</span>
            <input
              type="text"
              name="titulo"
              value={formulario.titulo}
              onChange={actualizarCampo}
              placeholder="Título de la canción"
            />
          </label>

          <label className="field">
            <span>Álbum (opcional)</span>
            <input
              type="text"
              name="album"
              value={formulario.album}
              onChange={actualizarCampo}
              placeholder="Álbum al que pertenece"
            />
          </label>

          <label className="field">
            <span>Género musical</span>
            <select name="genero" value={formulario.genero} onChange={actualizarCampo}>
              <option value="">Selecciona un género</option>
              {generosDisponibles.map((genero) => (
                <option key={genero} value={genero}>
                  {genero}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field artist-admin-bio-field">
          <span>Descripción (opcional)</span>
          <textarea
            name="descripcion"
            value={formulario.descripcion}
            onChange={actualizarCampo}
            rows={3}
            maxLength={500}
            placeholder="Cuéntale a los usuarios sobre esta canción"
          />
        </label>

        <div className="form-grid">
          <label className="field">
            <span>Archivo de audio (MP3, WAV, OGG o M4A, máx. 20MB)</span>
            <input
              ref={inputAudioRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
              onChange={(event) => setArchivoAudio(event.target.files?.[0] || null)}
            />
          </label>

          <label className="field">
            <span>Portada (opcional)</span>
            <input
              ref={inputPortadaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setArchivoPortada(event.target.files?.[0] || null)}
            />
          </label>
        </div>

        {mensajeError && <p className="form-error">{mensajeError}</p>}
        {mensajeExito && <p className="form-success">{mensajeExito}</p>}

        <button type="submit" className="save-button" disabled={publicando}>
          {publicando ? "Publicando..." : "Publicar canción"}
        </button>
      </form>

      <article className="profile-card">
        <div className="form-header">
          <h3>Mis canciones publicadas</h3>
          <p>Edita o elimina el contenido que ya publicaste.</p>
        </div>

        {cargando ? (
          <p className="search-empty">Cargando tus canciones...</p>
        ) : canciones.length === 0 ? (
          <p className="search-empty">Todavía no publicaste ninguna canción.</p>
        ) : (
          <ul className="music-admin-list">
            {canciones.map((cancion) => (
              <li className="music-admin-item" key={cancion.id}>
                {cancionEnEdicion === cancion.id ? (
                  <form
                    className="music-admin-edit-form"
                    onSubmit={(event) => guardarEdicion(event, cancion.id)}
                  >
                    <div className="form-grid">
                      <label className="field">
                        <span>Título</span>
                        <input
                          type="text"
                          name="titulo"
                          value={formularioEdicion.titulo}
                          onChange={actualizarCampoEdicion}
                        />
                      </label>

                      <label className="field">
                        <span>Álbum (opcional)</span>
                        <input
                          type="text"
                          name="album"
                          value={formularioEdicion.album}
                          onChange={actualizarCampoEdicion}
                        />
                      </label>

                      <label className="field">
                        <span>Género musical</span>
                        <select
                          name="genero"
                          value={formularioEdicion.genero}
                          onChange={actualizarCampoEdicion}
                        >
                          <option value="">Selecciona un género</option>
                          {generosDisponibles.map((genero) => (
                            <option key={genero} value={genero}>
                              {genero}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="field artist-admin-bio-field">
                      <span>Descripción (opcional)</span>
                      <textarea
                        name="descripcion"
                        value={formularioEdicion.descripcion}
                        onChange={actualizarCampoEdicion}
                        rows={2}
                        maxLength={500}
                      />
                    </label>

                    <div className="form-grid">
                      <label className="field">
                        <span>Reemplazar audio (opcional)</span>
                        <input
                          type="file"
                          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a"
                          onChange={(event) =>
                            setArchivoAudioEdicion(event.target.files?.[0] || null)
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Reemplazar portada (opcional)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) =>
                            setArchivoPortadaEdicion(event.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>

                    <div className="music-admin-actions">
                      <button type="submit" className="save-button" disabled={guardandoEdicion}>
                        {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button
                        type="button"
                        className="secondary-link-button"
                        onClick={cancelarEdicion}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div
                      className="music-admin-item-cover"
                      style={
                        cancion.portadaUrl
                          ? { backgroundImage: `url("${cancion.portadaUrl}")` }
                          : undefined
                      }
                    >
                      {!cancion.portadaUrl && <span>♫</span>}
                    </div>

                    <div className="music-admin-item-body">
                      <strong>{cancion.titulo}</strong>
                      <span>
                        {cancion.album || "Sin álbum"} • {cancion.genero}
                      </span>
                      <audio controls src={cancion.audioUrl} preload="none" />
                    </div>

                    <div className="music-admin-actions">
                      <button
                        type="button"
                        className="secondary-link-button"
                        onClick={() => iniciarEdicion(cancion)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="secondary-link-button music-admin-delete-button"
                        onClick={() => eliminarCancion(cancion)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

export default GestionCanciones;
