import { useEffect, useState } from "react";
import RecortarImagenModal from "./RecortarImagenModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const CONFIG_RECORTE = {
  foto: { aspecto: 1, anchoSalida: 512, altoSalida: 512, forma: "round", titulo: "Recortar foto de perfil" },
  portada: { aspecto: 4, anchoSalida: 1600, altoSalida: 400, forma: "rect", titulo: "Recortar portada" },
};

function PerfilArtista({ usuario, onVerPerfilPublico }) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const [recorte, setRecorte] = useState(null);

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [generosDisponibles, setGenerosDisponibles] = useState([]);
  const [fotoUrl, setFotoUrl] = useState(null);
  const [portadaUrl, setPortadaUrl] = useState(null);

  const [formulario, setFormulario] = useState({
    nombreArtistico: "",
    biografia: "",
    generos: [],
  });

  const construirUrlImagen = (ruta) => {
    if (!ruta) {
      return null;
    }

    if (/^https?:\/\//i.test(ruta)) {
      return ruta;
    }

    return `${API_URL.replace(/\/api\/?$/, "")}${ruta}`;
  };

  const cargarDatosIniciales = async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setMensajeError("Debe iniciar sesión nuevamente.");
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setMensajeError("");

      const [respuestaPerfil, respuestaGeneros] = await Promise.all([
        fetch(`${API_URL}/artistas/perfil/mi-perfil`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/artistas/generos-disponibles`),
      ]);

      const datosPerfil = await respuestaPerfil.json();
      const datosGeneros = await respuestaGeneros.json();

      if (!respuestaPerfil.ok) {
        throw new Error(datosPerfil.mensaje || "No se pudo cargar el perfil de artista.");
      }

      setGenerosDisponibles(datosGeneros.generos || []);
      setFotoUrl(datosPerfil.perfil?.fotoUrl || null);
      setPortadaUrl(datosPerfil.perfil?.portadaUrl || null);
      setFormulario({
        nombreArtistico: datosPerfil.perfil?.nombreArtistico || "",
        biografia: datosPerfil.perfil?.biografia || "",
        generos: datosPerfil.perfil?.generos || [],
      });
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosIniciales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setFormulario((anterior) => ({ ...anterior, [name]: value }));
  };

  const alternarGenero = (genero) => {
    setFormulario((anterior) => {
      const yaSeleccionado = anterior.generos.includes(genero);

      const generos = yaSeleccionado
        ? anterior.generos.filter((item) => item !== genero)
        : [...anterior.generos, genero];

      return { ...anterior, generos };
    });
  };

  const validarFormulario = () => {
    const nombreLimpio = formulario.nombreArtistico.trim();
    const biografiaLimpia = formulario.biografia.trim();

    if (!nombreLimpio || nombreLimpio.length < 2) {
      setMensajeError("El nombre artístico debe tener al menos 2 caracteres.");
      return false;
    }

    if (!biografiaLimpia) {
      setMensajeError("La biografía es obligatoria.");
      return false;
    }

    if (formulario.generos.length === 0) {
      setMensajeError("Debe seleccionar al menos un género musical.");
      return false;
    }

    return true;
  };

  const guardarPerfil = async (event) => {
    event.preventDefault();

    setMensajeError("");
    setMensajeExito("");

    if (!validarFormulario()) {
      return;
    }

    try {
      setGuardando(true);
      const token = sessionStorage.getItem("token");

      const respuesta = await fetch(`${API_URL}/artistas/perfil/mi-perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombreArtistico: formulario.nombreArtistico.trim(),
          biografia: formulario.biografia.trim(),
          generos: formulario.generos,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar el perfil de artista.");
      }

      setFormulario({
        nombreArtistico: datos.perfil.nombreArtistico,
        biografia: datos.perfil.biografia,
        generos: datos.perfil.generos,
      });
      setMensajeExito(datos.mensaje || "Perfil de artista actualizado correctamente.");
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const subirImagen = async (tipo, archivo) => {
    if (!archivo) {
      return;
    }

    const setSubiendo = tipo === "foto" ? setSubiendoFoto : setSubiendoPortada;
    const campoFormulario = tipo === "foto" ? "foto" : "portada";

    setMensajeError("");
    setMensajeExito("");

    try {
      setSubiendo(true);
      const token = sessionStorage.getItem("token");

      const cuerpo = new FormData();
      cuerpo.append(campoFormulario, archivo);

      const respuesta = await fetch(`${API_URL}/artistas/perfil/${tipo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: cuerpo,
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo subir la imagen.");
      }

      if (tipo === "foto") {
        setFotoUrl(datos.fotoUrl);
      } else {
        setPortadaUrl(datos.portadaUrl);
      }

      setMensajeExito(datos.mensaje || "Imagen actualizada correctamente.");
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setSubiendo(false);
    }
  };

  const seleccionarImagen = (tipo, archivo) => {
    if (!archivo) {
      return;
    }

    setRecorte({ tipo, urlOriginal: URL.createObjectURL(archivo) });
  };

  const cerrarRecorte = () => {
    if (recorte) {
      URL.revokeObjectURL(recorte.urlOriginal);
    }

    setRecorte(null);
  };

  const confirmarRecorte = async (blob) => {
    const tipo = recorte.tipo;
    const archivoRecortado = new File([blob], `${tipo}.jpg`, { type: "image/jpeg" });

    cerrarRecorte();
    await subirImagen(tipo, archivoRecortado);
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
    <section className="profile-section artist-admin-section">
      <article className="profile-card artist-admin-cover-card">
        <div
          className="artist-admin-cover-preview"
          style={
            portadaUrl
              ? { backgroundImage: `url("${construirUrlImagen(portadaUrl)}")` }
              : undefined
          }
        >
          <label className="artist-admin-upload-button artist-admin-upload-button--cover">
            {subiendoPortada ? "Subiendo..." : "Cambiar portada"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={subiendoPortada}
              onChange={(event) => {
                seleccionarImagen("portada", event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="artist-admin-identity">
          <div
            className={`preview-avatar profile-avatar-xl artist-admin-avatar ${
              fotoUrl ? "profile-avatar-xl--photo" : ""
            }`}
          >
            {fotoUrl && <img src={construirUrlImagen(fotoUrl)} alt="Foto de perfil del artista" />}
            <span>{formulario.nombreArtistico?.charAt(0).toUpperCase() || "A"}</span>
            <label className="artist-admin-upload-button artist-admin-upload-button--avatar">
              {subiendoFoto ? "..." : "Cambiar"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={subiendoFoto}
                onChange={(event) => {
                  seleccionarImagen("foto", event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          <div>
            <p className="section-label">ADMINISTRAR PERFIL DE ARTISTA</p>
            <h2>{formulario.nombreArtistico || usuario.nombre}</h2>
            {onVerPerfilPublico && formulario.nombreArtistico && (
              <button
                type="button"
                className="secondary-link-button"
                onClick={() => onVerPerfilPublico(formulario.nombreArtistico)}
              >
                Ver mi perfil público
              </button>
            )}
          </div>
        </div>
      </article>

      <form className="profile-card profile-form artist-admin-form" onSubmit={guardarPerfil}>
        <div className="form-header">
          <h3>Información pública</h3>
          <p>Estos datos son visibles para todos los usuarios de iStream.</p>
        </div>

        {cargando ? (
          <p className="search-empty">Cargando perfil de artista...</p>
        ) : (
          <>
            <div className="form-grid">
              <label className="field">
                <span>Nombre artístico</span>
                <input
                  type="text"
                  name="nombreArtistico"
                  value={formulario.nombreArtistico}
                  onChange={actualizarCampo}
                  placeholder="Nombre con el que te conocerán en iStream"
                />
              </label>
            </div>

            <label className="field artist-admin-bio-field">
              <span>Biografía</span>
              <textarea
                name="biografia"
                value={formulario.biografia}
                onChange={actualizarCampo}
                placeholder="Contale a los usuarios quién sos y qué hacés"
                rows={4}
                maxLength={500}
              />
            </label>

            <div className="field">
              <span>Géneros musicales</span>
              <div className="artist-admin-genero-grid">
                {generosDisponibles.map((genero) => {
                  const seleccionado = formulario.generos.includes(genero);

                  return (
                    <button
                      type="button"
                      key={genero}
                      className={`tag-pill artist-admin-genero-pill ${
                        seleccionado ? "artist-admin-genero-pill--activo" : ""
                      }`}
                      onClick={() => alternarGenero(genero)}
                    >
                      {genero}
                    </button>
                  );
                })}
              </div>
            </div>

            {mensajeError && <p className="form-error">{mensajeError}</p>}
            {mensajeExito && <p className="form-success">{mensajeExito}</p>}

            <button type="submit" className="save-button" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </>
        )}
      </form>

      {recorte && (
        <RecortarImagenModal
          imagenUrl={recorte.urlOriginal}
          aspecto={CONFIG_RECORTE[recorte.tipo].aspecto}
          anchoSalida={CONFIG_RECORTE[recorte.tipo].anchoSalida}
          altoSalida={CONFIG_RECORTE[recorte.tipo].altoSalida}
          forma={CONFIG_RECORTE[recorte.tipo].forma}
          titulo={CONFIG_RECORTE[recorte.tipo].titulo}
          onCancelar={cerrarRecorte}
          onConfirmar={confirmarRecorte}
        />
      )}
    </section>
  );
}

export default PerfilArtista;
