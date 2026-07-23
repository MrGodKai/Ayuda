const express = require("express");

const verificarToken = require(
  "../middleware/auth.middleware"
);

const {
  obtenerCancionesPopulares,
} = require(
  "../controllers/canciones.controller"
);

const router = express.Router();

/*
 * Solo un usuario autenticado puede
 * consultar las canciones populares.
 */
router.get(
  "/populares",
  verificarToken,
  obtenerCancionesPopulares
);

module.exports = router;