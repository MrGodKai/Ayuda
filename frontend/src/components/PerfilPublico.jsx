import { useEffect, useMemo, useRef, useState } from "react";

const FRASES_DEBUT = [
  "Rockeando desde {fecha}",
  "Pop star mundial desde {fecha}!",
  "Haciendo historia musical desde {fecha}",
  "Subido al escenario desde {fecha}",
  "Llenando estadios desde {fecha}",
];

function formatearConteo(numero) {
  const valor = Number(numero) || 0;

  return new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valor);
}

function formatearFechaLarga(fecha) {
  if (!fecha) {
    return null;
  }

  const fechaObjeto = new Date(fecha);

  if (Number.isNaN(fechaObjeto.getTime())) {
    return null;
  }

  return fechaObjeto.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
  });
}

function textoConexiones(muestra, total) {
  const nombres = muestra.map((persona) => persona.nombre);

  if (nombres.length === 0) {
    return "";
  }

  if (nombres.length === 1) {
    return `${nombres[0]} de las cuentas que sigues sigue a este usuario`;
  }

  const restantes = total - nombres.length;

  if (restantes <= 0) {
    return `${nombres.join(" y ")} de las cuentas que sigues siguen a este usuario`;
  }

  return `${nombres.join(", ")} y ${restantes} más de las cuentas que sigues siguen a este usuario`;
}

function PerfilPublico({
  perfil,
  cargando,
  error,
  usuarioActual,
  onSeguir,
  onDejarDeSeguir,
  onAbrirChat,
  onReproducirCancion,
  onVolver,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [procesandoSeguir, setProcesandoSeguir] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuAbierto) {
      return undefined;
    }

    const cerrarSiEsAfuera = (evento) => {
      if (menuRef.current && !menuRef.current.contains(evento.target)) {
        setMenuAbierto(false);
      }
    };

    document.addEventListener("mousedown", cerrarSiEsAfuera);
    return () => document.removeEventListener("mousedown", cerrarSiEsAfuera);
  }, [menuAbierto]);

  const fraseDebut = useMemo(() => {
    if (!perfil?.fechaDebut) {
      return null;
    }

    const plantilla = FRASES_DEBUT[Math.floor(Math.random() * FRASES_DEBUT.length)];
    const fechaLegible = formatearFechaLarga(perfil.fechaDebut);

    return plantilla.replace("{fecha}", fechaLegible || perfil.fechaDebut);
  }, [perfil?.idArtista, perfil?.fechaDebut]);

  if (cargando) {
    return (
      <section className="pp-shell">
        <p className="pp-loading">Cargando perfil...</p>
      </section>
    );
  }

  if (error || !perfil) {
    return (
      <section className="pp-shell">
        <p className="pp-error">{error || "No se pudo cargar este perfil."}</p>
        <button type="button" className="secondary-link-button" onClick={onVolver}>
          Volver
        </button>
      </section>
    );
  }

  const esArtista = perfil.tipo === "artista";
  const mostrarAccionesSocial = !perfil.esPropio && perfil.idUsuario !== null;
  const fechaUnionLegible = formatearFechaLarga(perfil.fechaUnion);

  const copiarEnlace = async () => {
    const identificador = esArtista ? perfil.idArtista : perfil.idUsuario;
    const url = `${window.location.origin}${window.location.pathname}#perfil-${perfil.tipo}-${identificador}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const alternarSeguir = async () => {
    if (procesandoSeguir) {
      return;
    }

    try {
      setProcesandoSeguir(true);

      if (perfil.relacion.loSigo) {
        await onDejarDeSeguir(perfil.idUsuario);
      } else {
        await onSeguir(perfil.idUsuario);
      }
    } finally {
      setProcesandoSeguir(false);
    }
  };

  const reproducir = (cancion) => {
    onReproducirCancion({
      ...cancion,
      artista: perfil.nombre,
      duracion: cancion.duracionSegundos,
      portada: cancion.portadaUrl,
    });
  };

  return (
    <section className="pp-shell">
      <header className="pp-topbar">
        <button type="button" className="pp-back" onClick={onVolver} aria-label="Volver">
          ←
        </button>
        <h1 className="pp-topbar-name">{perfil.nombre}</h1>
        <div className="pp-topbar-actions">
          <button type="button" className="pp-icon-btn" disabled title="Próximamente">
            🔔
          </button>
        </div>
      </header>

      <div
        className={`pp-banner ${!perfil.portadaUrl ? "pp-banner--vacio" : ""}`}
        style={perfil.portadaUrl ? { backgroundImage: `url("${perfil.portadaUrl}")` } : undefined}
      >
        <div className="pp-banner-fade" />

        <div className="pp-actions">
          <div className="pp-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="pp-round-btn"
              onClick={() => setMenuAbierto((valor) => !valor)}
              aria-label="Más opciones"
            >
              ···
            </button>
            {menuAbierto && (
              <ul className="pp-menu">
                <li>
                  <button type="button" className="pp-menu-item" onClick={copiarEnlace}>
                    {copiado ? "¡Enlace copiado!" : "Copiar enlace al perfil"}
                  </button>
                </li>
              </ul>
            )}
          </div>

          {mostrarAccionesSocial && (
            <>
              <button
                type="button"
                className="pp-round-btn"
                disabled={!perfil.relacion.puedeChatear}
                title={
                  perfil.relacion.puedeChatear
                    ? "Chatear"
                    : "Necesitan seguirse mutuamente para chatear"
                }
                onClick={() => onAbrirChat(perfil.idUsuario)}
                aria-label="Chatear"
              >
                ✉
              </button>

              <button type="button" className="pp-round-btn" disabled title="Próximamente" aria-label="Notificarme">
                🔔
              </button>

              <button
                type="button"
                className={`pp-follow-pill ${perfil.relacion.loSigo ? "pp-follow-pill--following" : ""}`}
                onClick={alternarSeguir}
                disabled={procesandoSeguir}
              >
                {perfil.relacion.loSigo ? (
                  <>
                    <span className="pp-follow-label pp-follow-label--following">Siguiendo</span>
                    <span className="pp-follow-label pp-follow-label--unfollow">Dejar de seguir</span>
                  </>
                ) : (
                  "Seguir"
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pp-avatar-wrap">
        <div className="pp-avatar">
          {perfil.fotoUrl ? (
            <img src={perfil.fotoUrl} alt={perfil.nombre} />
          ) : (
            <span aria-hidden="true">{perfil.nombre?.charAt(0).toUpperCase() || "?"}</span>
          )}
        </div>
      </div>

      <div className="pp-identity">
        <h2 className="pp-name">{perfil.nombre}</h2>
        {perfil.correo && <p className="pp-email">{perfil.correo}</p>}
        {perfil.biografia && <p className="pp-bio">{perfil.biografia}</p>}

        <ul className="pp-meta">
          {fraseDebut && (
            <li className="pp-meta-item">
              <span className="pp-meta-icon" aria-hidden="true">🎤</span>
              {fraseDebut}
            </li>
          )}
          {fechaUnionLegible && (
            <li className="pp-meta-item">
              <span className="pp-meta-icon" aria-hidden="true">📅</span>
              Se unió en {fechaUnionLegible}
            </li>
          )}
        </ul>

        {mostrarAccionesSocial && (
          <div className="pp-stats">
            <span className="pp-stat">
              <strong>{formatearConteo(perfil.estadisticas.siguiendo)}</strong> Siguiendo
            </span>
            <span className="pp-stat">
              <strong>{formatearConteo(perfil.estadisticas.seguidores)}</strong> Seguidores
            </span>
          </div>
        )}

        {perfil.conexionesComunes.total > 0 && (
          <div className="pp-mutuals">
            <div className="pp-mutual-avatars">
              {perfil.conexionesComunes.muestra.map((persona) => (
                <div className="pp-mutual-avatar" key={persona.id}>
                  {persona.fotoUrl ? (
                    <img src={persona.fotoUrl} alt={persona.nombre} />
                  ) : (
                    <span aria-hidden="true">{persona.nombre.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="pp-mutuals-text">
              {textoConexiones(perfil.conexionesComunes.muestra, perfil.conexionesComunes.total)}
            </p>
          </div>
        )}
      </div>

      <hr className="pp-divider" />

      <div className="pp-content">
        {esArtista ? (
          <>
            {perfil.generos.length > 0 && (
              <div className="pp-section">
                <p className="pp-section-title">Géneros musicales</p>
                <div className="pp-genre-row">
                  {perfil.generos.map((genero) => (
                    <span className="pp-genre-chip" key={genero}>{genero}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="pp-section">
              <p className="pp-section-title">Canciones</p>
              {perfil.contenido.canciones.length === 0 ? (
                <p className="pp-empty">Este artista todavía no publicó canciones.</p>
              ) : (
                <div className="pp-song-grid">
                  {perfil.contenido.canciones.map((cancion) => (
                    <button
                      type="button"
                      key={cancion.id}
                      className="pp-song-card"
                      onClick={() => reproducir(cancion)}
                    >
                      <div
                        className="pp-song-cover"
                        style={cancion.portadaUrl ? { backgroundImage: `url("${cancion.portadaUrl}")` } : undefined}
                      >
                        {!cancion.portadaUrl && <span aria-hidden="true">♫</span>}
                      </div>
                      <div className="pp-song-title">{cancion.titulo}</div>
                      <div className="pp-song-sub">{cancion.album || "Sin álbum"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pp-section">
              <p className="pp-section-title">Álbumes</p>
              {perfil.contenido.albums.length === 0 ? (
                <p className="pp-empty">Todavía no hay álbumes publicados.</p>
              ) : (
                <div className="pp-album-grid">
                  {perfil.contenido.albums.map((album) => (
                    <div className="pp-album-card" key={album.nombre}>
                      <div
                        className="pp-album-cover"
                        style={album.portadaUrl ? { backgroundImage: `url("${album.portadaUrl}")` } : undefined}
                      >
                        {!album.portadaUrl && <span aria-hidden="true">♫</span>}
                      </div>
                      <div className="pp-album-name">{album.nombre}</div>
                      <div className="pp-album-count">{album.totalCanciones} canciones</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : !perfil.puedeVerActividad ? (
          <p className="pp-locked">🔒 Este perfil es privado. Solo puede ver su actividad si se siguen mutuamente.</p>
        ) : (
          <div className="pp-user-columns">
            <div className="pp-section">
              <p className="pp-section-title">Escuchado recientemente</p>
              {perfil.contenido.historial.length === 0 ? (
                <p className="pp-empty">Sin actividad reciente.</p>
              ) : (
                <ul className="pp-list">
                  {perfil.contenido.historial.map((item, indice) => (
                    <li className="pp-list-item" key={`${item.titulo}-${indice}`}>
                      <span className="pp-list-title">{item.titulo}</span>
                      <span className="pp-list-sub">{item.artista}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pp-section">
              <p className="pp-section-title">Canciones favoritas</p>
              {perfil.contenido.favoritos.length === 0 ? (
                <p className="pp-empty">Todavía no marcó favoritas.</p>
              ) : (
                <ul className="pp-list">
                  {perfil.contenido.favoritos.map((item, indice) => (
                    <li className="pp-list-item" key={`${item.titulo}-${indice}`}>
                      <span className="pp-list-title">{item.titulo}</span>
                      <span className="pp-list-sub">{item.artista}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pp-section">
              <p className="pp-section-title">Artistas más escuchados</p>
              {perfil.contenido.artistasFavoritos.length === 0 ? (
                <p className="pp-empty">Sin datos suficientes todavía.</p>
              ) : (
                <div className="pp-artists">
                  {perfil.contenido.artistasFavoritos.map((item) => (
                    <span className="pp-artist-chip" key={item.artista}>
                      {item.artista} · {item.reproducciones}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PerfilPublico;
