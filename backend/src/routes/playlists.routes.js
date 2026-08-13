const express = require("express");

const verificarToken = require("../middleware/auth.middleware");

const {
  uploadPortadaPlaylist,
  manejarErroresUpload,
} = require("../middleware/upload.middleware");

const {
  listarMisPlaylists,
  crearPlaylist,
  actualizarPlaylist,
  eliminarPlaylist,
  subirPortadaPlaylist,
  agregarCancionAPlaylist,
  eliminarCancionDePlaylist,
} = require("../controllers/playlists.controller");

const router = express.Router();

router.use(verificarToken);

router.get("/", listarMisPlaylists);
router.post("/", crearPlaylist);
router.patch("/:id", actualizarPlaylist);
router.delete("/:id", eliminarPlaylist);

router.post(
  "/:id/portada",
  manejarErroresUpload(uploadPortadaPlaylist.single("portada")),
  subirPortadaPlaylist
);

router.post("/:id/canciones", agregarCancionAPlaylist);
router.delete("/:id/canciones/:idCancion", eliminarCancionDePlaylist);

module.exports = router;
