const {
  rateLimit,
} = require("express-rate-limit");

const limitarSolicitudesRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    mensaje:
      "Demasiadas solicitudes de recuperación. Intente nuevamente en 15 minutos.",
  },
});

const limitarRestablecimientoContrasena = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    mensaje:
      "Demasiados intentos para restablecer la contraseña. Intente nuevamente en 15 minutos.",
  },
});

const limitarCambioContrasena = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    mensaje:
      "Demasiados intentos para cambiar la contraseña. Intente nuevamente en 15 minutos.",
  },
});

module.exports = {
  limitarSolicitudesRecuperacion,
  limitarRestablecimientoContrasena,
  limitarCambioContrasena,
};
