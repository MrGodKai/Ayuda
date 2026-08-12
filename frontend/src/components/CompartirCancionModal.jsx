import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function obtenerInicial(nombre) {
  return (nombre || "?").trim().charAt(0).toUpperCase() || "?";
}

function obtenerPortadaCancion(cancion) {
  return cancion?.portada || cancion?.portadaUrl || cancion?.portada_url || null;
}

async function leerJsonSeguro(respuesta) {
  try {
    return await respuesta.json();
  } catch {
    return {};
  }
}

function CompartirCancionModal({ cancion, onCerrar }) {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [enviandoId, setEnviandoId] = useState(null);
  const [enviadosIds, setEnviadosIds] = useState(new Set());

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setError("Debe iniciar sesión nuevamente.");
      setCargando(false);
      return;
    }

    (async () => {
      try {
        const respuesta = await fetch(`${API_URL}/mensajes/conversaciones`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const datos = await leerJsonSeguro(respuesta);

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No se pudieron cargar tus contactos.");
        }

        setContactos(Array.isArray(datos.conversaciones) ? datos.conversaciones : []);
      } catch (err) {
        setError(err.message || "No se pudieron cargar tus contactos.");
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const compartirCon = async (idContacto) => {
    const token = sessionStorage.getItem("token");

    if (!token || !cancion?.id || enviandoId) {
      return;
    }

    try {
      setEnviandoId(idContacto);

      const respuesta = await fetch(`${API_URL}/mensajes/${idContacto}/cancion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ idCancion: cancion.id }),
      });

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo compartir la canción.");
      }

      setEnviadosIds((actuales) => new Set(actuales).add(idContacto));
    } catch (err) {
      setError(err.message || "No se pudo compartir la canción.");
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <div className="share-modal-backdrop" onClick={onCerrar}>
      <div className="share-modal-card" onClick={(evento) => evento.stopPropagation()}>
        <h3>Compartir canción</h3>

        <div className="share-modal-song">
          <span
            className="social-song-cover"
            style={
              obtenerPortadaCancion(cancion)
                ? { backgroundImage: `url("${obtenerPortadaCancion(cancion)}")` }
                : undefined
            }
          />
          <span className="social-song-info">
            <strong>{cancion?.titulo}</strong>
            <span>{cancion?.artista}</span>
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}

        {cargando ? (
          <p className="social-panel-hint">Cargando contactos...</p>
        ) : contactos.length === 0 ? (
          <div className="social-empty-state">
            <p>No tienes contactos para compartir.</p>
            <span>
              Solo puedes compartir canciones con personas que te sigan mutuamente.
            </span>
          </div>
        ) : (
          <ul className="share-modal-contact-list">
            {contactos.map((contacto) => {
              const yaEnviado = enviadosIds.has(contacto.idUsuario);

              return (
                <li key={contacto.idUsuario} className="share-modal-contact-row">
                  <span className="sp-avatar">{obtenerInicial(contacto.nombre)}</span>
                  <span className="social-conversation-info">
                    <strong>{contacto.nombre}</strong>
                  </span>
                  <button
                    type="button"
                    className={`secondary-link-button ${yaEnviado ? "share-modal-sent-button" : ""}`}
                    onClick={() => compartirCon(contacto.idUsuario)}
                    disabled={enviandoId === contacto.idUsuario || yaEnviado}
                  >
                    {yaEnviado
                      ? "Enviado ✓"
                      : enviandoId === contacto.idUsuario
                      ? "Enviando..."
                      : "Enviar"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="crop-modal-actions">
          <button type="button" className="save-button" onClick={onCerrar}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompartirCancionModal;
