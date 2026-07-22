const express = require("express");

const verificarToken = require("../middleware/auth.middleware");

const {
  obtenerHistorialUsuario,
  registrarReproduccion,
  eliminarRegistroHistorial,
  limpiarHistorialUsuario,
} = require("../controllers/historial.controller");

const router = express.Router();

router.use(verificarToken);

router.get("/", obtenerHistorialUsuario);
router.post("/", registrarReproduccion);
router.delete("/", limpiarHistorialUsuario);
router.delete("/:id", eliminarRegistroHistorial);

module.exports = router;
