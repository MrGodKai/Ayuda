import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function PerfilArtista({ usuario, onDatosCargados }) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [generosDisponibles, setGenerosDisponibles] = useState([]);

  const [formulario, setFormulario] = useState({
    nombreArtistico: "",
    generos: [],
    fechaDebut: "",
  });

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
      setFormulario({
        nombreArtistico: datosPerfil.perfil?.nombreArtistico || "",
        generos: datosPerfil.perfil?.generos || [],
        fechaDebut: datosPerfil.perfil?.fechaDebut || "",
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

  useEffect(() => {
    if (formulario.nombreArtistico) {
      onDatosCargados?.(formulario.nombreArtistico);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulario.nombreArtistico]);

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

    if (!nombreLimpio || nombreLimpio.length < 2) {
      setMensajeError("El nombre artístico debe tener al menos 2 caracteres.");
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
          generos: formulario.generos,
          fechaDebut: formulario.fechaDebut || null,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo guardar el perfil de artista.");
      }

      setFormulario({
        nombreArtistico: datos.perfil.nombreArtistico,
        generos: datos.perfil.generos,
        fechaDebut: datos.perfil.fechaDebut || "",
      });
      setMensajeExito(datos.mensaje || "Perfil de artista actualizado correctamente.");
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (usuario?.rol !== "artista") {
    return <p className="search-empty">Esta sección solo está disponible para cuentas de artista.</p>;
  }

  return (
    <form className="profile-card profile-form" onSubmit={guardarPerfil}>
      <div className="form-header">
        <h3>Cuenta de artista</h3>
        <p>Estos datos son visibles para todos los usuarios de iStream en tu perfil público.</p>
      </div>

      {cargando ? (
        <p className="search-empty">Cargando datos de artista...</p>
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

            <label className="field">
              <span>Fecha de debut</span>
              <input
                type="date"
                name="fechaDebut"
                value={formulario.fechaDebut}
                onChange={actualizarCampo}
                max={new Date().toISOString().slice(0, 10)}
              />
            </label>
          </div>

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
  );
}

export default PerfilArtista;
