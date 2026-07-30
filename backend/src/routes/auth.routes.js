const express = require("express");

const {
  registrar,
  iniciarSesion,
  solicitarRecuperacionContrasena,
  restablecerContrasena,
  cambiarContrasena,
} = require(
  "../controllers/auth.controller"
);

const {
  obtenerPerfil,
  actualizarPerfil,
} = require(
  "../controllers/perfil.controller"
);

const verificarToken = require(
  "../middleware/auth.middleware"
);

const limitarIntentosLogin = require(
  "../middleware/auth-rate-limit.middleware"
);

const {
  limitarSolicitudesRecuperacion,
  limitarRestablecimientoContrasena,
  limitarCambioContrasena,
} = require(
  "../middleware/password-rate-limit.middleware"
);

const router = express.Router();

router.post(
  "/register",
  registrar
);

router.post(
  "/login",
  limitarIntentosLogin,
  iniciarSesion
);

router.post(
  "/forgot-password",
  limitarSolicitudesRecuperacion,
  solicitarRecuperacionContrasena
);

router.post(
  "/reset-password",
  limitarRestablecimientoContrasena,
  restablecerContrasena
);

router.post(
  "/change-password",
  verificarToken,
  limitarCambioContrasena,
  cambiarContrasena
);

router.get(
  "/perfil",
  verificarToken,
  obtenerPerfil
);

router.put(
  "/perfil",
  verificarToken,
  actualizarPerfil
);

module.exports = router;