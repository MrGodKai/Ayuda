const express = require("express");
const { obtenerArtistas, obtenerPerfilArtista } = require("../controllers/artistas.controller");

const router = express.Router();

router.get("/", obtenerArtistas);
router.get("/:nombre", obtenerPerfilArtista);

module.exports = router;
