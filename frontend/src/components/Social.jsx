import { useEffect, useMemo, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const INTERVALO_LISTA_MS = 18 * 1000;
const INTERVALO_MENSAJES_MS = 4 * 1000;

function obtenerInicial(nombre) {
  return (nombre || "?").trim().charAt(0).toUpperCase() || "?";
}

function formatearHora(fecha) {
  if (!fecha) {
    return "";
  }

  const instante = new Date(fecha);

  if (Number.isNaN(instante.getTime())) {
    return "";
  }

  const hoy = new Date();
  const esHoy = instante.toDateString() === hoy.toDateString();

  if (esHoy) {
    return instante.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return instante.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
}

async function leerJsonSeguro(respuesta) {
  try {
    return await respuesta.json();
  } catch {
    return {};
  }
}

function Social({
  usuario,
  onSesionExpirada,
  conversacionInicialId = null,
  onConversacionInicialConsumida,
  onReproducirCancion,
}) {
  const [conversaciones, setConversaciones] = useState([]);
  const [cargandoConversaciones, setCargandoConversaciones] = useState(true);
  const [errorConversaciones, setErrorConversaciones] = useState("");
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  const [conversacionActivaId, setConversacionActivaId] = useState(null);
  const [contactoActivo, setContactoActivo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [errorMensajes, setErrorMensajes] = useState("");
  const [mutuoRoto, setMutuoRoto] = useState(false);

  const [textoNuevoMensaje, setTextoNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const scrollMensajesRef = useRef(null);
  const intervaloMensajesRef = useRef(null);

  const obtenerHeaders = () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      return null;
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const manejarRespuestaAuth = (respuesta) => {
    if (respuesta.status === 401) {
      onSesionExpirada?.();
      return true;
    }

    return false;
  };

  const cargarConversaciones = async () => {
    const headers = obtenerHeaders();

    if (!headers) {
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/mensajes/conversaciones`, {
        method: "GET",
        headers,
      });

      if (manejarRespuestaAuth(respuesta)) {
        return;
      }

      const datos = await leerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudieron cargar tus conversaciones.");
      }

      setConversaciones(Array.isArray(datos.conversaciones) ? datos.conversaciones : []);
      setErrorConversaciones("");
    } catch (error) {
      setErrorConversaciones(error.message || "No se pudieron cargar tus conversaciones.");
    } finally {
      setCargandoConversaciones(false);
    }
  };

  const cargarMensajes = async (idContacto) => {
    const headers = obtenerHeaders();

    if (!headers) {
      return;
    }

    try {
      setCargandoMensajes(true);

      const respuesta = await fetch(`${API_URL}/mensajes/${idContacto}`, {
        method: "GET",
        headers,
      });

      if (manejarRespuestaAuth(respuesta)) {
        return;
      }

      const datos = await leerJsonSeguro(respuesta);

      if (respuesta.status === 403) {
        setMutuoRoto(true);
        if (intervaloMensajesRef.current) {
          clearInterval(intervaloMensajesRef.current);
          intervaloMensajesRef.current = null;
        }
        return;
      }

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo obtener el historial de mensajes.");
      }

      setMutuoRoto(false);
      setContactoActivo(datos.contacto || null);
      setMensajes(Array.isArray(datos.mensajes) ? datos.mensajes : []);
      setErrorMensajes("");

      setConversaciones((actuales) =>
        actuales.map((c) => (c.idUsuario === idContacto ? { ...c, noLeidos: 0 } : c))
      );
    } catch (error) {
      setErrorMensajes(error.message || "No se pudo obtener el historial de mensajes.");
    } finally {
      setCargandoMensajes(false);
    }
  };

  const abrirConversacion = (idUsuario) => {
    setConversacionActivaId(idUsuario);
    setMutuoRoto(false);
    setErrorMensajes("");
    setMensajes([]);
  };

  const enviarMensaje = async () => {
    const contenido = textoNuevoMensaje.trim();

    if (!contenido || !conversacionActivaId || enviando) {
      return;
    }

    const headers = obtenerHeaders();

    if (!headers) {
      return;
    }

    try {
      setEnviando(true);

      const respuesta = await fetch(`${API_URL}/mensajes/${conversacionActivaId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ contenido }),
      });

      if (manejarRespuestaAuth(respuesta)) {
        return;
      }

      const datos = await leerJsonSeguro(respuesta);

      if (respuesta.status === 403) {
        setMutuoRoto(true);
        return;
      }

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo enviar el mensaje.");
      }

      setMensajes((actuales) => [...actuales, datos.mensaje]);
      setTextoNuevoMensaje("");
      cargarConversaciones();
    } catch (error) {
      setErrorMensajes(error.message || "No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  };

  useEffect(() => {
    if (!usuario?.id) {
      return;
    }

    cargarConversaciones();

    const intervalo = setInterval(cargarConversaciones, INTERVALO_LISTA_MS);

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  useEffect(() => {
    if (!conversacionInicialId) {
      return;
    }

    abrirConversacion(conversacionInicialId);
    onConversacionInicialConsumida?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionInicialId]);

  useEffect(() => {
    if (!conversacionActivaId) {
      return;
    }

    cargarMensajes(conversacionActivaId);

    intervaloMensajesRef.current = setInterval(() => {
      cargarMensajes(conversacionActivaId);
    }, INTERVALO_MENSAJES_MS);

    return () => {
      if (intervaloMensajesRef.current) {
        clearInterval(intervaloMensajesRef.current);
        intervaloMensajesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionActivaId]);

  useEffect(() => {
    if (scrollMensajesRef.current) {
      scrollMensajesRef.current.scrollTop = scrollMensajesRef.current.scrollHeight;
    }
  }, [mensajes.length]);

  const conversacionesFiltradas = useMemo(() => {
    const termino = terminoBusqueda.trim().toLowerCase();

    if (!termino) {
      return conversaciones;
    }

    return conversaciones.filter((c) =>
      c.nombre?.toLowerCase().includes(termino) ||
      c.ultimoMensaje?.toLowerCase().includes(termino)
    );
  }, [conversaciones, terminoBusqueda]);

  const manejarEnvioConEnter = (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviarMensaje();
    }
  };

  return (
    <div className="social-shell">
      <div className="social-list-panel">
        <input
          type="text"
          className="search-box social-search-input"
          placeholder="Buscar conversaciones..."
          value={terminoBusqueda}
          onChange={(evento) => setTerminoBusqueda(evento.target.value)}
        />

        {cargandoConversaciones ? (
          <p className="social-panel-hint">Cargando conversaciones...</p>
        ) : errorConversaciones ? (
          <p className="social-panel-hint social-panel-hint--error">{errorConversaciones}</p>
        ) : conversaciones.length === 0 ? (
          <div className="social-empty-state">
            <p>Aún no tienes conversaciones.</p>
            <span>
              Los chats aparecerán automáticamente cuando tú y otro usuario se sigan
              mutuamente.
            </span>
          </div>
        ) : (
          <ul className="social-conversation-list">
            {conversacionesFiltradas.map((conversacion) => (
              <li
                key={conversacion.idUsuario}
                className={`social-conversation-row ${
                  conversacionActivaId === conversacion.idUsuario
                    ? "social-conversation-row--active"
                    : ""
                }`}
                onClick={() => abrirConversacion(conversacion.idUsuario)}
              >
                <span className="sp-avatar">{obtenerInicial(conversacion.nombre)}</span>
                <span className="social-conversation-info">
                  <span className="social-conversation-top">
                    <strong>{conversacion.nombre}</strong>
                    <span className="social-conversation-time">
                      {formatearHora(conversacion.ultimoMensajeFecha)}
                    </span>
                  </span>
                  <span className="social-conversation-preview">
                    {conversacion.ultimoMensaje
                      ? `${conversacion.ultimoMensajeEsMio ? "Tú: " : ""}${conversacion.ultimoMensaje}`
                      : "Empiecen a chatear"}
                  </span>
                </span>
                {conversacion.noLeidos > 0 && (
                  <span className="social-unread-badge">{conversacion.noLeidos}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="social-chat-panel">
        {!conversacionActivaId ? (
          <div className="social-empty-state">
            <p>Selecciona una conversación para comenzar a chatear.</p>
          </div>
        ) : (
          <>
            <div className="social-chat-header">
              <span className="sp-avatar">{obtenerInicial(contactoActivo?.nombre)}</span>
              <div className="social-chat-header-info">
                <strong>{contactoActivo?.nombre || "..."}</strong>
                <span>
                  <span
                    className={`social-status-dot ${
                      contactoActivo?.enLinea ? "social-status-dot--online" : ""
                    }`}
                  />
                  {contactoActivo?.enLinea ? "En línea" : "Desconectado"}
                </span>
              </div>
            </div>

            {mutuoRoto ? (
              <div className="social-empty-state">
                <p>Ya no tienes una conversación activa con este usuario.</p>
                <span>Esto ocurre cuando alguno de los dos dejó de seguir al otro.</span>
              </div>
            ) : (
              <>
                <div className="social-messages-scroll" ref={scrollMensajesRef}>
                  {cargandoMensajes && mensajes.length === 0 ? (
                    <p className="social-panel-hint">Cargando mensajes...</p>
                  ) : errorMensajes ? (
                    <p className="social-panel-hint social-panel-hint--error">{errorMensajes}</p>
                  ) : mensajes.length === 0 ? (
                    <p className="social-panel-hint">Todavía no hay mensajes. ¡Saluda!</p>
                  ) : (
                    mensajes.map((mensaje) =>
                      mensaje.tipo === "cancion" && mensaje.cancion ? (
                        <button
                          key={mensaje.id}
                          type="button"
                          className={`social-message-bubble social-message-bubble--song ${
                            mensaje.propio
                              ? "social-message-bubble--mine"
                              : "social-message-bubble--theirs"
                          }`}
                          onClick={() => onReproducirCancion?.(mensaje.cancion)}
                        >
                          <span
                            className="social-song-cover"
                            style={
                              mensaje.cancion.portada
                                ? { backgroundImage: `url("${mensaje.cancion.portada}")` }
                                : undefined
                            }
                          />
                          <span className="social-song-info">
                            <strong>{mensaje.cancion.titulo}</strong>
                            <span>{mensaje.cancion.artista}</span>
                          </span>
                        </button>
                      ) : (
                        <div
                          key={mensaje.id}
                          className={`social-message-bubble ${
                            mensaje.propio
                              ? "social-message-bubble--mine"
                              : "social-message-bubble--theirs"
                          }`}
                        >
                          {mensaje.contenido}
                        </div>
                      )
                    ))}
                </div>

                <div className="social-input-bar">
                  <input
                    type="text"
                    className="search-box social-message-input"
                    placeholder="Escribe un mensaje..."
                    value={textoNuevoMensaje}
                    onChange={(evento) => setTextoNuevoMensaje(evento.target.value)}
                    onKeyDown={manejarEnvioConEnter}
                    disabled={enviando}
                  />
                  <button
                    type="button"
                    className="save-button"
                    onClick={enviarMensaje}
                    disabled={enviando || !textoNuevoMensaje.trim()}
                  >
                    Enviar
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Social;
