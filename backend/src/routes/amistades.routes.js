const express = require("express");

const verificarToken = require(
  "../middleware/auth.middleware"
);

const {
  obtenerRedSeguidores,
  seguirUsuario,
  dejarDeSeguirUsuario,
  buscarUsuariosAmistad,
  obtenerPerfilAmigo,
} = require(
  "../controllers/amistades.controller"
);

const router = express.Router();

router.use(verificarToken);

router.get("/", obtenerRedSeguidores);
router.get("/usuarios", buscarUsuariosAmistad);
router.get("/perfil/:idUsuario", obtenerPerfilAmigo);
router.post("/follow", seguirUsuario);
router.delete("/follow/:idUsuario", dejarDeSeguirUsuario);

module.exports = router;
