const express = require("express");

const verificarToken = require("../middleware/auth.middleware");

const {
  obtenerPerfilPublicoUsuario,
  obtenerPerfilPublicoArtista,
} = require("../controllers/perfil-publico.controller");

const router = express.Router();

router.use(verificarToken);

router.get("/usuario/:idUsuario", obtenerPerfilPublicoUsuario);
router.get("/artista/:identificador", obtenerPerfilPublicoArtista);

module.exports = router;
