const express = require("express");
const {
  registrar,
  iniciarSesion,
} = require("../controllers/auth.controller");
const {
  obtenerPerfil,
  actualizarPerfil,
} = require("../controllers/perfil.controller");
const verificarToken = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", registrar);
router.post("/login", iniciarSesion);
router.get("/perfil", verificarToken, obtenerPerfil);
router.put("/perfil", verificarToken, actualizarPerfil);

module.exports = router;
