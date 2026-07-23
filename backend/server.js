require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require(
  "./src/config/db"
);

const authRoutes = require(
  "./src/routes/auth.routes"
);

const busquedaRoutes = require(
  "./src/routes/busqueda.routes"
);

const cancionesRoutes = require(
  "./src/routes/canciones.routes"
);

const artistasRoutes = require(
  "./src/routes/artistas.routes"
);

const historialRoutes = require(
  "./src/routes/historial.routes"
);

const favoritosRoutes = require(
  "./src/routes/favoritos.routes"
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

const ALLOWED_ORIGINS = new Set([
  FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
]);

/*
 * Oculta el encabezado que indica
 * que el servidor utiliza Express.
 */
app.disable("x-powered-by");

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite peticiones sin origin (Postman/cURL) y los puertos locales de Vite.
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origen no permitido por CORS.")
      );
    },
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
  "/api/busqueda",
  busquedaRoutes
);


app.use(
  "/api/historial",
  historialRoutes
);

app.use(
  "/api/favoritos",
  favoritosRoutes
);

app.use(
  "/api/usuarios",
  usuariosRoutes
);

app.use(
  "/api/artistas",
  artistasRoutes
);

app.use(
  "/api/busqueda",
  busquedaRoutes
);

app.use(
  "/api/canciones",
  cancionesRoutes
);

/*
 * ---------------------------.
 */
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

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS historial_reproducciones (
         id_historial INT AUTO_INCREMENT PRIMARY KEY,
         id_usuario INT NOT NULL,
         id_cancion INT NULL,
         titulo_cancion VARCHAR(150) NOT NULL,
         artista_cancion VARCHAR(150) NOT NULL,
         album_cancion VARCHAR(150) NULL,
         reproducido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

         INDEX idx_historial_usuario_fecha (id_usuario, reproducido_en),

         CONSTRAINT fk_historial_usuario
           FOREIGN KEY (id_usuario)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE,

         CONSTRAINT fk_historial_cancion
           FOREIGN KEY (id_cancion)
           REFERENCES canciones(id_cancion)
           ON DELETE SET NULL
           ON UPDATE CASCADE
       )`
    );

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS canciones_favoritas (
         id_favorito INT AUTO_INCREMENT PRIMARY KEY,
         id_usuario INT NOT NULL,
         id_cancion INT NULL,
         titulo_cancion VARCHAR(150) NOT NULL,
         artista_cancion VARCHAR(150) NOT NULL,
         album_cancion VARCHAR(150) NULL,
         audio_url VARCHAR(500) NULL,
         creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

         INDEX idx_favoritos_usuario_fecha (id_usuario, creado_en),
         UNIQUE KEY uk_favorito_usuario_cancion (id_usuario, titulo_cancion, artista_cancion),

         CONSTRAINT fk_favoritos_usuario
           FOREIGN KEY (id_usuario)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE,

         CONSTRAINT fk_favoritos_cancion
           FOREIGN KEY (id_cancion)
           REFERENCES canciones(id_cancion)
           ON DELETE SET NULL
           ON UPDATE CASCADE
       )`
    );

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