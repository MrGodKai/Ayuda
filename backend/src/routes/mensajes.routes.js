const express = require("express");

const verificarToken = require(
  "../middleware/auth.middleware"
);

const {
  obtenerConversaciones,
  obtenerMensajesConContacto,
  enviarMensaje,
  compartirCancion,
} = require(
  "../controllers/mensajes.controller"
);

const router = express.Router();

router.use(verificarToken);

router.get("/conversaciones", obtenerConversaciones);
router.get("/:idContacto", obtenerMensajesConContacto);
router.post("/:idContacto", enviarMensaje);
router.post("/:idContacto/cancion", compartirCancion);

module.exports = router;
