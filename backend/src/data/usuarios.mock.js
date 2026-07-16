const bcrypt = require("bcryptjs");

const usuariosLocal = [
  {
    id_usuario: 1,
    nombre: "Sofía Álvarez",
    correo: "sofia.alvarez@example.com",
    contrasena_hash: "$2b$12$Yx0brhVlPcBBkt3tmn5pf.1ZI3Jj6a9vYD3lbsQu5.dlNDR/Bo306",
    rol: "usuario",
    estado: true,
    foto_perfil: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    telefono: "+54 9 11 5555-1010",
    ciudad: "Buenos Aires",
    creado_en: "2026-01-15T09:30:00.000Z",
  },
  {
    id_usuario: 2,
    nombre: "Mateo Rivera",
    correo: "mateo.rivera@example.com",
    contrasena_hash: "$2b$12$06r9k3bPAYK07eK8.EhsMeqhKgvKDb7w7hdIRXf7D/fG3FitAH9U.",
    rol: "usuario",
    estado: true,
    foto_perfil: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    telefono: "+54 9 11 5555-2020",
    ciudad: "Córdoba",
    creado_en: "2026-01-18T14:10:00.000Z",
  },
  {
    id_usuario: 3,
    nombre: "Valentina Torres",
    correo: "valentina.torres@example.com",
    contrasena_hash: "$2b$12$vpgnfuec6ckyXC1XyUihcOBXoIlaRHusLLMTbZEaGLvKT7ja2u3Ra",
    rol: "artista",
    estado: true,
    foto_perfil: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80",
    telefono: "+54 9 11 5555-3030",
    ciudad: "Mendoza",
    creado_en: "2026-02-02T11:45:00.000Z",
  },
];

let siguienteId = usuariosLocal.length + 1;

function buscarUsuarioPorCorreo(correo) {
  const correoNormalizado = String(correo || "").trim().toLowerCase();

  return usuariosLocal.find(
    (usuario) => usuario.correo === correoNormalizado
  ) || null;
}

function buscarUsuarioPorId(id) {
  return usuariosLocal.find((usuario) => usuario.id_usuario === Number(id)) || null;
}

function agregarUsuario({ nombre, correo, contrasenaHash, rol = "usuario" }) {
  const nuevoUsuario = {
    id_usuario: siguienteId,
    nombre: nombre.trim(),
    correo: String(correo).trim().toLowerCase(),
    contrasena_hash: contrasenaHash,
    rol,
    estado: true,
    foto_perfil: null,
    telefono: null,
    ciudad: null,
    creado_en: new Date().toISOString(),
  };

  usuariosLocal.push(nuevoUsuario);
  siguienteId += 1;

  return nuevoUsuario;
}

function actualizarUsuario(id, cambios) {
  const usuario = buscarUsuarioPorId(id);

  if (!usuario) {
    return null;
  }

  Object.assign(usuario, cambios);
  return usuario;
}

function obtenerTodosLosUsuarios() {
  return usuariosLocal;
}

module.exports = {
  usuariosLocal,
  buscarUsuarioPorCorreo,
  buscarUsuarioPorId,
  agregarUsuario,
  actualizarUsuario,
  obtenerTodosLosUsuarios,
};
