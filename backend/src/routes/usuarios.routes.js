const express = require("express");

const verificarToken = require(
  "../middleware/auth.middleware"
);

const {
  ROLES,
  autorizarRoles,
} = require(
  "../middleware/roles.middleware"
);

const {
  listarUsuarios,
  cambiarRol,
} = require(
  "../controllers/usuarios.controller"
);

const router = express.Router();

/*
 * Todas las rutas de este archivo requieren:
 *
 * 1. Un JWT válido.
 * 2. Que el usuario sea administrador.
 */
router.use(verificarToken);

router.use(
  autorizarRoles(
    ROLES.ADMINISTRADOR
  )
);

router.get("/", listarUsuarios);

router.patch(
  "/:id/rol",
  cambiarRol
);

module.exports = router;