const express = require("express");

const verificarToken = require(
  "../middleware/auth.middleware"
);

const { ROLES, autorizarRoles } = require(
  "../middleware/roles.middleware"
);

const {
  obtenerCancionesPopulares,
  transmitirAudioCancion,
} = require(
  "../controllers/canciones.controller"
);

const {
  obtenerMisCanciones,
  crearCancion,
  actualizarCancion,
  eliminarCancion,
} = require(
  "../controllers/canciones-artista.controller"
);

const {
  uploadArchivosCancion,
  manejarErroresUpload,
} = require("../middleware/upload.middleware");

const router = express.Router();

/*
 * Rutas específicas antes de cualquier
 * comodín futuro tipo "/:id".
 */
router.get(
  "/populares",
  verificarToken,
  obtenerCancionesPopulares
);

/*
 * Sin verificarToken a propósito: un <audio src="..."> del navegador
 * no puede mandar el header Authorization, igual que ya pasa con los
 * archivos servidos desde /uploads.
 */
router.get(
  "/:id/audio",
  transmitirAudioCancion
);

router.get(
  "/mis-canciones",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  obtenerMisCanciones
);

router.post(
  "/",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  manejarErroresUpload(uploadArchivosCancion),
  crearCancion
);

router.put(
  "/:id",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  manejarErroresUpload(uploadArchivosCancion),
  actualizarCancion
);

router.delete(
  "/:id",
  verificarToken,
  autorizarRoles(ROLES.ARTISTA),
  eliminarCancion
);

module.exports = router;