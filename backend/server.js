require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require(
  "./src/config/db"
);

const authRoutes = require(
  "./src/routes/auth.routes"
);

const usuariosRoutes = require(
  "./src/routes/usuarios.routes"
);

const app = express();

const PORT = Number(
  process.env.PORT || 3001
);

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

/*
 * Oculta el encabezado que indica
 * que el servidor utiliza Express.
 */
app.disable("x-powered-by");

app.use(
  cors({
    origin: FRONTEND_URL,
  })
);

/*
 * Limita el tamaño de los JSON recibidos.
 */
app.use(
  express.json({
    limit: "100kb",
  })
);

app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      mensaje:
        "Backend funcionando correctamente con datos locales.",
    });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/usuarios",
  usuariosRoutes
);

app.use((req, res) => {
  res.status(404).json({
    mensaje:
      "Ruta no encontrada.",
  });
});

/**
 * Comprueba la conexión con MySQL
 * antes de levantar el servidor.
 */
async function iniciarServidor() {
  try {
    const conexion =
      await pool.getConnection();

    await conexion.ping();

    conexion.release();

    app.listen(PORT, () => {
      console.log(
        `Servidor funcionando en http://localhost:${PORT}`
      );

      console.log(
        "Conexión con MySQL verificada."
      );
    });
  } catch (error) {
    console.error(
      "No se pudo conectar con MySQL:",
      error.message
    );

    process.exit(1);
  }
}

iniciarServidor();