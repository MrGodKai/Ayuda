const {
  rateLimit,
} = require("express-rate-limit");

const limitarIntentosLogin = rateLimit({
  // Ventana de 15 minutos.
  windowMs: 15 * 60 * 1000,

  // Máximo 10 intentos fallidos por dirección IP.
  limit: 10,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  // Los inicios de sesión exitosos no cuentan.
  skipSuccessfulRequests: true,

  message: {
    mensaje:
      "Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.",
  },
});

module.exports = limitarIntentosLogin;