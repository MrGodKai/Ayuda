const pool = require("../config/db");
const {
  ROLES,
} = require(
  "../middleware/roles.middleware"
);

const ROLES_VALIDOS =
  Object.values(ROLES);

/**
 * Lista usuarios.
 *
 * Solo podrá ejecutarlo un administrador.
 */
exports.listarUsuarios = async (
  req,
  res
) => {
  try {
    const [usuarios] =
      await pool.execute(
        `SELECT
           id_usuario,
           nombre,
           correo,
           rol,
           estado,
           creado_en,
           actualizado_en
         FROM usuarios
         ORDER BY creado_en DESC`
      );

    return res.status(200).json({
      usuarios: usuarios.map(
        (usuario) => ({
          id: usuario.id_usuario,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
          estado: Boolean(
            usuario.estado
          ),
          creadoEn:
            usuario.creado_en,
          actualizadoEn:
            usuario.actualizado_en,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Error al listar usuarios:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudieron obtener los usuarios.",
    });
  }
};

/**
 * Cambia el rol de un usuario.
 *
 * Solo podrá ejecutarlo un administrador.
 */
exports.cambiarRol = async (
  req,
  res
) => {
  try {
    const idUsuario = Number(
      req.params.id
    );

    const rol = String(
      req.body.rol || ""
    )
      .trim()
      .toLowerCase();

    if (
      !Number.isInteger(idUsuario) ||
      idUsuario <= 0
    ) {
      return res.status(400).json({
        mensaje:
          "El identificador del usuario no es válido.",
      });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        mensaje:
          `El rol debe ser uno de estos valores: ${ROLES_VALIDOS.join(
            ", "
          )}.`,
      });
    }

    const [resultado] =
      await pool.execute(
        `UPDATE usuarios
         SET rol = ?
         WHERE id_usuario = ?`,
        [rol, idUsuario]
      );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje:
          "Usuario no encontrado.",
      });
    }

    const [usuarios] =
      await pool.execute(
        `SELECT
           id_usuario,
           nombre,
           correo,
           rol,
           estado
         FROM usuarios
         WHERE id_usuario = ?
         LIMIT 1`,
        [idUsuario]
      );

    const usuario = usuarios[0];

    return res.status(200).json({
      mensaje:
        "Rol actualizado correctamente.",
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        estado: Boolean(
          usuario.estado
        ),
      },
    });
  } catch (error) {
    console.error(
      "Error al cambiar el rol:",
      error
    );

    return res.status(500).json({
      mensaje:
        "No se pudo actualizar el rol del usuario.",
    });
  }
};