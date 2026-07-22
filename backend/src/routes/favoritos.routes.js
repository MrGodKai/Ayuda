const express = require("express");

const verificarToken = require("../middleware/auth.middleware");

const {
  obtenerFavoritosUsuario,
  agregarFavorito,
  eliminarFavorito,
} = require("../controllers/favoritos.controller");

const router = express.Router();

router.use(verificarToken);

router.get("/", obtenerFavoritosUsuario);
router.post("/", agregarFavorito);
router.delete("/:id", eliminarFavorito);

module.exports = router;
