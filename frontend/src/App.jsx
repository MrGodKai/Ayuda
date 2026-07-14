import { useState } from "react";
import Login from "./components/Login";

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
  const [usuario, setUsuario] = useState(
    obtenerUsuarioGuardado
  );

  const cerrarSesion = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    setUsuario(null);
  };

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <p className="welcome-logo">♫ iStream</p>

        <h1>¡Bienvenida, {usuario.nombre}!</h1>

        <p>
          El inicio de sesión funcionó correctamente.
          Posteriormente aquí se mostrará la pantalla principal de
          música.
        </p>

        <div className="user-information">
          <span>Correo</span>
          <strong>{usuario.correo}</strong>

          <span>Rol</span>
          <strong>{usuario.rol}</strong>
        </div>

        <button type="button" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

export default App;