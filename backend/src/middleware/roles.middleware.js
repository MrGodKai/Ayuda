const ROLES = Object.freeze({
  USUARIO: "usuario",
  ARTISTA: "artista",
  ADMINISTRADOR: "administrador",
});

const ROLES_VALIDOS = Object.values(ROLES);

/**
 * Permite el acceso únicamente a los roles indicados.
 *
 * Ejemplo:
 * autorizarRoles(
 *   ROLES.ARTISTA,
 *   ROLES.ADMINISTRADOR
 * )
 */
function autorizarRoles(...rolesPermitidos) {
  if (rolesPermitidos.length === 0) {
    throw new Error(
      "Debe indicar al menos un rol permitido."
    );
  }

  const rolesInvalidos = rolesPermitidos.filter(
    (rol) => !ROLES_VALIDOS.includes(rol)
  );

  if (rolesInvalidos.length > 0) {
    throw new Error(
      `Roles no válidos en la configuración: ${rolesInvalidos.join(
        ", "
      )}`
    );
  }

  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje:
          "Debe iniciar sesión para acceder a este recurso.",
      });
    }

    if (
      !rolesPermitidos.includes(req.usuario.rol)
    ) {
      return res.status(403).json({
        mensaje:
          "No tiene permisos para acceder a este recurso.",
      });
    }

    return next();
  };
}

module.exports = {
  ROLES,
  autorizarRoles,
};