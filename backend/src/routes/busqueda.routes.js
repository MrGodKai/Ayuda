const express = require("express");
const { buscarContenido } = require("../controllers/busqueda.controller");

const router = express.Router();

router.get("/", buscarContenido);

module.exports = router;
