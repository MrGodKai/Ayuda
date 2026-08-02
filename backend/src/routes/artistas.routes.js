const express = require("express");
const { obtenerArtistas, obtenerPerfilArtista } = require("../controllers/artistas.controller");

const {
  obtenerGenerosDisponibles,
  obtenerMiPerfilArtista,
  actualizarMiPerfilArtista,
  subirFotoPerfilArtista,
  subirPortadaArtista,
} = require("../controllers/artista-perfil.controller");

const verificarToken = require("../middleware/auth.middleware");
const { ROLES, autorizarRoles } = require("../middleware/roles.middleware");

const {
  uploadFotoArtista,
  uploadPortadaArtista,
  manejarErroresUpload,
} = require("../middleware/upload.middleware");

const router = express.Router();

/*
 * Rutas específicas primero: deben registrarse antes de
 * "/:nombre" para que ese comodín no las intercepte.
 */
router.get("/generos-disponibles", obtenerGenerosDisponibles);

router.get(
  "/perfil/mi-perfil",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  obtenerMiPerfilArtista
);

router.put(
  "/perfil/mi-perfil",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  actualizarMiPerfilArtista
);

router.post(
  "/perfil/foto",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  manejarErroresUpload(uploadFotoArtista.single("foto")),
  subirFotoPerfilArtista
);

router.post(
  "/perfil/portada",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  manejarErroresUpload(uploadPortadaArtista.single("portada")),
  subirPortadaArtista
);

router.get("/", obtenerArtistas);
router.get("/:nombre", obtenerPerfilArtista);

module.exports = router;
