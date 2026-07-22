import { useState } from "react";
import "./Login.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const CONTRASENA_SEGURA_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,72}$/;

function Login({ onLogin }) {
  const [modo, setModo] = useState("login");

  const [formulario, setFormulario] = useState({
    nombre: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
  });

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [cargando, setCargando] = useState(false);

  const esRegistro = modo === "register";

  const actualizarCampo = (event) => {
    const { name, value } = event.target;

    setFormulario((formularioAnterior) => ({
      ...formularioAnterior,
      [name]: value,
    }));
  };

  const cambiarModo = () => {
    setModo((modoAnterior) =>
      modoAnterior === "login" ? "register" : "login"
    );

    setMensajeError("");
    setMensajeExito("");

    setFormulario((formularioAnterior) => ({
      nombre: "",
      correo: formularioAnterior.correo,
      contrasena: "",
      confirmarContrasena: "",
    }));
  };

  const validarFormulario = () => {
    if (!formulario.correo.trim() || !formulario.contrasena) {
      setMensajeError("Debe completar el correo y la contraseña.");
      return false;
    }

    if (esRegistro) {
      if (!formulario.nombre.trim()) {
        setMensajeError("Debe ingresar su nombre.");
        return false;
      }

      if (formulario.nombre.trim().length < 2) {
        setMensajeError("El nombre debe contener al menos 2 caracteres.");
        return false;
      }

      if (
  !CONTRASENA_SEGURA_REGEX.test(
    formulario.contrasena
  )
) {
  setMensajeError(
    "La contraseña debe incluir mayúscula, minúscula, número y símbolo."
  );

  return false;
}

      if (formulario.contrasena !== formulario.confirmarContrasena) {
        setMensajeError("Las contraseñas no coinciden.");
        return false;
      }
    }

    return true;
  };

  const enviarFormulario = async (event) => {
    event.preventDefault();

    setMensajeError("");
    setMensajeExito("");

    if (!validarFormulario()) {
      return;
    }

    try {
      setCargando(true);

      const endpoint = esRegistro ? "/auth/register" : "/auth/login";
      const cuerpoSolicitud = esRegistro
        ? {
            nombre: formulario.nombre.trim(),
            correo: formulario.correo.trim(),
            contrasena: formulario.contrasena,
          }
        : {
            correo: formulario.correo.trim(),
            contrasena: formulario.contrasena,
          };

      const respuesta = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuerpoSolicitud),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo completar la solicitud.");
      }

      if (esRegistro) {
        setMensajeExito("Usuario registrado correctamente. Ya puede iniciar sesión.");
        setModo("login");
        setFormulario((formularioAnterior) => ({
          nombre: "",
          correo: formularioAnterior.correo,
          contrasena: "",
          confirmarContrasena: "",
        }));
        return;
      }

      sessionStorage.setItem("token", datos.token);
      sessionStorage.setItem("usuario", JSON.stringify(datos.usuario));
      onLogin(datos.usuario);
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-decoration">
        <div className="brand">
          <span className="brand-icon">♫</span>
          <span>iStream</span>
        </div>

        <div className="decoration-content">
          <p className="small-title">TU MÚSICA, TU COMUNIDAD</p>

          <h1>
            Escucha, comparte
            <br />
            y conecta.
          </h1>

          <p>
            Accede a tus canciones, playlists, favoritos e interacciones musicales.
          </p>
        </div>
      </section>

      <section className="login-container">
        <form className="login-card" onSubmit={enviarFormulario}>
          <div className="mobile-brand">
            <span>♫</span> iStream
          </div>

          <h2>{esRegistro ? "Crear una cuenta" : "Iniciar sesión"}</h2>

          <p className="subtitle">
            {esRegistro
              ? "Complete sus datos para registrarse en iStream."
              : "Ingrese sus datos para acceder a su cuenta."}
          </p>

          {esRegistro && (
            <div className="form-group">
              <label htmlFor="nombre">Nombre completo</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ingrese su nombre"
                value={formulario.nombre}
                onChange={actualizarCampo}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="correo">Correo electrónico</label>
            <input
              id="correo"
              name="correo"
              type="email"
              placeholder="nombre@correo.com"
              value={formulario.correo}
              onChange={actualizarCampo}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              name="contrasena"
              type="password"
              placeholder={esRegistro? "Mayúscula, minúscula, número y símbolo": "Ingrese su contraseña"}
              value={formulario.contrasena}
              onChange={actualizarCampo}
              autoComplete={esRegistro ? "new-password" : "current-password"}
              required
            />
          </div>

          {esRegistro && (
            <div className="form-group">
              <label htmlFor="confirmarContrasena">Confirmar contraseña</label>
              <input
                id="confirmarContrasena"
                name="confirmarContrasena"
                type="password"
                placeholder="Repita su contraseña"
                value={formulario.confirmarContrasena}
                onChange={actualizarCampo}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {mensajeError && <p className="error-message">{mensajeError}</p>}
          {mensajeExito && <p className="success-message">{mensajeExito}</p>}

          <button type="submit" className="login-button" disabled={cargando}>
            {cargando
              ? esRegistro
                ? "Registrando..."
                : "Ingresando..."
              : esRegistro
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>

          <p className="register-text">
            {esRegistro ? "¿Ya tienes una cuenta?" : "¿Todavía no tienes una cuenta?"}{" "}
            <button type="button" className="link-button" onClick={cambiarModo}>
              {esRegistro ? "Iniciar sesión" : "Regístrate"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;