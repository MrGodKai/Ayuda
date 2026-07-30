import { useState } from "react";
import "./Login.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTRASENA_SEGURA_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,72}$/;

function obtenerTokenDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("token") || "").trim();
}

function limpiarTokenDeURL() {
  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  const nuevaUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nuevaUrl);
}

function obtenerConfigModo(modo) {
  if (modo === "register") {
    return {
      titulo: "Crear una cuenta",
      subtitulo: "Complete sus datos para registrarse en iStream.",
      boton: "Crear cuenta",
      botonCargando: "Registrando...",
    };
  }

  if (modo === "recover") {
    return {
      titulo: "Recuperar contraseña",
      subtitulo:
        "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.",
      boton: "Enviar enlace",
      botonCargando: "Enviando...",
    };
  }

  if (modo === "reset") {
    return {
      titulo: "Restablecer contraseña",
      subtitulo:
        "Define una nueva contraseña segura para tu cuenta.",
      boton: "Actualizar contraseña",
      botonCargando: "Actualizando...",
    };
  }

  return {
    titulo: "Iniciar sesión",
    subtitulo: "Ingrese sus datos para acceder a su cuenta.",
    boton: "Iniciar sesión",
    botonCargando: "Ingresando...",
  };
}

function Login({ onLogin }) {
  const tokenInicial = obtenerTokenDesdeURL();
  const [modo, setModo] = useState(tokenInicial ? "reset" : "login");
  const [tokenRecuperacion, setTokenRecuperacion] = useState(tokenInicial);

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
  const esLogin = modo === "login";
  const esRecuperacion = modo === "recover";
  const esReset = modo === "reset";

  const configModo = obtenerConfigModo(modo);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;

    setFormulario((formularioAnterior) => ({
      ...formularioAnterior,
      [name]: value,
    }));
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);

    setMensajeError("");
    setMensajeExito("");

    setFormulario((formularioAnterior) => ({
      nombre: "",
      correo:
        nuevoModo === "login" || nuevoModo === "recover"
          ? formularioAnterior.correo
          : "",
      contrasena: "",
      confirmarContrasena: "",
    }));

    if (nuevoModo !== "reset") {
      setTokenRecuperacion("");
      limpiarTokenDeURL();
    }
  };

  const validarFormulario = () => {
    const correo = formulario.correo.trim();

    if (esReset) {
      if (!tokenRecuperacion) {
        setMensajeError("El enlace de recuperación es inválido.");
        return false;
      }

      if (!formulario.contrasena) {
        setMensajeError("Debe ingresar una nueva contraseña.");
        return false;
      }

      if (!CONTRASENA_SEGURA_REGEX.test(formulario.contrasena)) {
        setMensajeError(
          "La contraseña debe incluir mayúscula, minúscula, número y símbolo."
        );
        return false;
      }

      if (formulario.contrasena !== formulario.confirmarContrasena) {
        setMensajeError("Las contraseñas no coinciden.");
        return false;
      }

      return true;
    }

    if (!correo) {
      setMensajeError("Debe completar el correo electrónico.");
      return false;
    }

    if (!CORREO_REGEX.test(correo)) {
      setMensajeError("El correo no tiene un formato válido.");
      return false;
    }

    if (esRecuperacion) {
      return true;
    }

    if (!formulario.contrasena) {
      setMensajeError("Debe completar la contraseña.");
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

      if (!CONTRASENA_SEGURA_REGEX.test(formulario.contrasena)) {
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

      let endpoint = "/auth/login";
      let cuerpoSolicitud = {
        correo: formulario.correo.trim(),
        contrasena: formulario.contrasena,
      };

      if (esRegistro) {
        endpoint = "/auth/register";
        cuerpoSolicitud = {
          nombre: formulario.nombre.trim(),
          correo: formulario.correo.trim(),
          contrasena: formulario.contrasena,
        };
      }

      if (esRecuperacion) {
        endpoint = "/auth/forgot-password";
        cuerpoSolicitud = {
          correo: formulario.correo.trim(),
        };
      }

      if (esReset) {
        endpoint = "/auth/reset-password";
        cuerpoSolicitud = {
          token: tokenRecuperacion,
          contrasenaNueva: formulario.contrasena,
        };
      }

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

      if (esRecuperacion) {
        setMensajeExito(
          datos.mensaje ||
            "Si el correo existe, recibirás un enlace para restablecer tu contraseña."
        );
        return;
      }

      if (esReset) {
        setMensajeExito("Contraseña restablecida correctamente. Ya puedes iniciar sesión.");
        setTokenRecuperacion("");
        limpiarTokenDeURL();
        setModo("login");
        setFormulario((formularioAnterior) => ({
          nombre: "",
          correo: formularioAnterior.correo,
          contrasena: "",
          confirmarContrasena: "",
        }));
        return;
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

          <h2>{configModo.titulo}</h2>

          <p className="subtitle">{configModo.subtitulo}</p>

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

          {!esReset && (
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
          )}

          {!esRecuperacion && (
            <div className="form-group">
              <label htmlFor="contrasena">{esReset ? "Nueva contraseña" : "Contraseña"}</label>
              <input
                id="contrasena"
                name="contrasena"
                type="password"
                placeholder={
                  esRegistro || esReset
                    ? "Mayúscula, minúscula, número y símbolo"
                    : "Ingrese su contraseña"
                }
                value={formulario.contrasena}
                onChange={actualizarCampo}
                autoComplete={esRegistro || esReset ? "new-password" : "current-password"}
                required
              />
            </div>
          )}

          {(esRegistro || esReset) && (
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
            {cargando ? configModo.botonCargando : configModo.boton}
          </button>

          {esLogin && (
            <p className="register-text">
              <button
                type="button"
                className="link-button"
                onClick={() => cambiarModo("recover")}
              >
                Olvidé mi contraseña
              </button>
            </p>
          )}

          {esRecuperacion && (
            <p className="register-text">
              ¿Recordaste tu contraseña?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => cambiarModo("login")}
              >
                Volver a iniciar sesión
              </button>
            </p>
          )}

          {esReset && (
            <p className="register-text">
              <button
                type="button"
                className="link-button"
                onClick={() => cambiarModo("login")}
              >
                Cancelar y volver al inicio de sesión
              </button>
            </p>
          )}

          {(esLogin || esRegistro) && (
            <p className="register-text">
              {esRegistro ? "¿Ya tienes una cuenta?" : "¿Todavía no tienes una cuenta?"}{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => cambiarModo(esRegistro ? "login" : "register")}
              >
                {esRegistro ? "Iniciar sesión" : "Regístrate"}
              </button>
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default Login;