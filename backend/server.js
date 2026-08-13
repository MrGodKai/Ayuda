require("dotenv").config();

const path = require("path");

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

const amistadesRoutes = require(
  "./src/routes/amistades.routes"
);

const mensajesRoutes = require(
  "./src/routes/mensajes.routes"
);

const usuariosRoutes = require(
  "./src/routes/usuarios.routes"
);

const perfilPublicoRoutes = require(
  "./src/routes/perfil-publico.routes"
);

const playlistsRoutes = require(
  "./src/routes/playlists.routes"
);

const app = express();

app.set("trust proxy", 1);

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

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
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
  "/api/amistades",
  amistadesRoutes
);

app.use(
  "/api/mensajes",
  mensajesRoutes
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

app.use(
  "/api/perfiles",
  perfilPublicoRoutes
);

app.use(
  "/api/playlists",
  playlistsRoutes
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
      `CREATE TABLE IF NOT EXISTS artistas (
         id_artista INT AUTO_INCREMENT PRIMARY KEY,
         id_usuario INT NULL,
         nombre VARCHAR(150) NOT NULL UNIQUE,
         biografia VARCHAR(500) NULL,
         foto_url VARCHAR(500) NULL,
         portada_url VARCHAR(500) NULL,
         generos VARCHAR(255) NULL,
         estado BOOLEAN NOT NULL DEFAULT TRUE,
         creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

         actualizado_en TIMESTAMP
           NOT NULL
           DEFAULT CURRENT_TIMESTAMP
           ON UPDATE CURRENT_TIMESTAMP,

         UNIQUE KEY uk_artistas_usuario (id_usuario),

         CONSTRAINT fk_artistas_usuario
           FOREIGN KEY (id_usuario)
           REFERENCES usuarios(id_usuario)
           ON DELETE SET NULL
           ON UPDATE CASCADE
       )`
    );

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

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS password_resets (
         id_reset BIGINT AUTO_INCREMENT PRIMARY KEY,
         id_usuario INT NOT NULL,
         token_hash CHAR(64) NOT NULL,
         expira_en DATETIME NOT NULL,
         usado_en DATETIME NULL,
         solicitado_ip VARCHAR(45) NULL,
         solicitado_user_agent VARCHAR(255) NULL,
         creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

         UNIQUE KEY uk_password_resets_token_hash (token_hash),
         INDEX idx_password_resets_usuario (id_usuario, expira_en),

         CONSTRAINT fk_password_resets_usuario
           FOREIGN KEY (id_usuario)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE
       )`
    );

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS relaciones_amistad (
         id_relacion BIGINT AUTO_INCREMENT PRIMARY KEY,
         id_usuario_emisor INT NOT NULL,
         id_usuario_receptor INT NOT NULL,
         id_usuario_menor INT NOT NULL,
         id_usuario_mayor INT NOT NULL,
         estado ENUM('pendiente', 'aceptada', 'rechazada') NOT NULL DEFAULT 'pendiente',
         respondido_en DATETIME NULL,
         creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

         UNIQUE KEY uk_relaciones_amistad_par (id_usuario_menor, id_usuario_mayor),
         INDEX idx_relaciones_receptor_estado (id_usuario_receptor, estado, creado_en),
         INDEX idx_relaciones_emisor_estado (id_usuario_emisor, estado, creado_en),

         CONSTRAINT fk_relaciones_amistad_emisor
           FOREIGN KEY (id_usuario_emisor)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE,

         CONSTRAINT fk_relaciones_amistad_receptor
           FOREIGN KEY (id_usuario_receptor)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE
       )`
    );

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS seguidores_usuarios (
         id_seguimiento BIGINT AUTO_INCREMENT PRIMARY KEY,
         id_usuario_seguidor INT NOT NULL,
         id_usuario_seguido INT NOT NULL,
         creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

         UNIQUE KEY uk_seguimiento_par (id_usuario_seguidor, id_usuario_seguido),
         INDEX idx_seguidores_objetivo_fecha (id_usuario_seguido, creado_en),
         INDEX idx_siguiendo_origen_fecha (id_usuario_seguidor, creado_en),

         CONSTRAINT fk_seguidores_usuario_seguidor
           FOREIGN KEY (id_usuario_seguidor)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE,

         CONSTRAINT fk_seguidores_usuario_seguido
           FOREIGN KEY (id_usuario_seguido)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE
       )`
    );

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS playlists (
         id_playlist INT AUTO_INCREMENT PRIMARY KEY,
         id_usuario INT NOT NULL,
         nombre VARCHAR(150) NOT NULL,
         descripcion VARCHAR(500) NULL,
         portada_url VARCHAR(500) NULL,
         publica BOOLEAN NOT NULL DEFAULT TRUE,
         creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

         INDEX idx_playlists_usuario (id_usuario, creado_en),

         CONSTRAINT fk_playlists_usuario
           FOREIGN KEY (id_usuario)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE
       )`
    );

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS playlist_canciones (
         id_playlist_cancion INT AUTO_INCREMENT PRIMARY KEY,
         id_playlist INT NOT NULL,
         id_cancion INT NULL,
         titulo_cancion VARCHAR(150) NOT NULL,
         artista_cancion VARCHAR(150) NOT NULL,
         album_cancion VARCHAR(150) NULL,
         duracion_segundos INT NULL,
         portada_url VARCHAR(500) NULL,
         audio_url VARCHAR(500) NULL,
         agregado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

         INDEX idx_playlist_canciones_playlist (id_playlist, agregado_en),
         UNIQUE KEY uk_playlist_cancion (id_playlist, titulo_cancion, artista_cancion),

         CONSTRAINT fk_playlist_canciones_playlist
           FOREIGN KEY (id_playlist)
           REFERENCES playlists(id_playlist)
           ON DELETE CASCADE
           ON UPDATE CASCADE,

         CONSTRAINT fk_playlist_canciones_cancion
           FOREIGN KEY (id_cancion)
           REFERENCES canciones(id_cancion)
           ON DELETE SET NULL
           ON UPDATE CASCADE
       )`
    );

    await conexion.execute(
      `CREATE TABLE IF NOT EXISTS mensajes (
         id_mensaje BIGINT AUTO_INCREMENT PRIMARY KEY,
         id_usuario_emisor INT NOT NULL,
         id_usuario_receptor INT NOT NULL,
         contenido VARCHAR(2000) NOT NULL,
         leido_en TIMESTAMP NULL DEFAULT NULL,
         creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

         INDEX idx_mensajes_emisor_receptor_fecha (id_usuario_emisor, id_usuario_receptor, creado_en),
         INDEX idx_mensajes_receptor_emisor_fecha (id_usuario_receptor, id_usuario_emisor, creado_en),

         CONSTRAINT fk_mensajes_emisor
           FOREIGN KEY (id_usuario_emisor)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE,

         CONSTRAINT fk_mensajes_receptor
           FOREIGN KEY (id_usuario_receptor)
           REFERENCES usuarios(id_usuario)
           ON DELETE CASCADE
           ON UPDATE CASCADE
       )`
    );

    const [columnasArtistas] = await conexion.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'artistas'
         AND COLUMN_NAME IN ('id_usuario', 'portada_url')`
    );

    const columnasExistentes = new Set(
      columnasArtistas.map((fila) => fila.COLUMN_NAME)
    );

    if (!columnasExistentes.has("id_usuario")) {
      await conexion.execute(
        `ALTER TABLE artistas
         ADD COLUMN id_usuario INT NULL,
         ADD UNIQUE KEY uk_artistas_usuario (id_usuario),
         ADD CONSTRAINT fk_artistas_usuario
           FOREIGN KEY (id_usuario)
           REFERENCES usuarios(id_usuario)
           ON DELETE SET NULL
           ON UPDATE CASCADE`
      );
    }

    if (!columnasExistentes.has("portada_url")) {
      await conexion.execute(
        `ALTER TABLE artistas
         ADD COLUMN portada_url VARCHAR(500) NULL`
      );
    }

    const [columnasCanciones] = await conexion.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'canciones'
         AND COLUMN_NAME = 'id_artista'`
    );

    if (columnasCanciones.length === 0) {
      await conexion.execute(
        `ALTER TABLE canciones
         ADD COLUMN id_artista INT NULL,
         ADD CONSTRAINT fk_canciones_artista
           FOREIGN KEY (id_artista)
           REFERENCES artistas(id_artista)
           ON DELETE SET NULL
           ON UPDATE CASCADE`
      );
    }

    conexion.release();

    // Migraciones de columnas opcionales (idempotentes)
    try {
      const conn2 = await pool.getConnection();
      const [cols] = await conn2.execute(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'usuarios'
           AND COLUMN_NAME  = 'perfil_privado'`
      );
      if (cols[0].cnt === 0) {
        await conn2.execute(
          `ALTER TABLE usuarios
           ADD COLUMN perfil_privado BOOLEAN NOT NULL DEFAULT FALSE`
        );
      }
      conn2.release();
    } catch (migErr) {
      console.warn("Advertencia en migración perfil_privado:", migErr.message);
    }

    try {
      const conn3 = await pool.getConnection();
      const [colsActividad] = await conn3.execute(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'usuarios'
           AND COLUMN_NAME  = 'ultima_actividad'`
      );
      if (colsActividad[0].cnt === 0) {
        await conn3.execute(
          `ALTER TABLE usuarios
           ADD COLUMN ultima_actividad TIMESTAMP NULL DEFAULT NULL`
        );
      }
      conn3.release();
    } catch (migErr) {
      console.warn("Advertencia en migración ultima_actividad:", migErr.message);
    }

    try {
      const conn4 = await pool.getConnection();
      const [columnasUsuarios] = await conn4.execute(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'usuarios'
           AND COLUMN_NAME IN ('biografia', 'portada_url')`
      );

      const columnasUsuariosExistentes = new Set(
        columnasUsuarios.map((fila) => fila.COLUMN_NAME)
      );

      if (!columnasUsuariosExistentes.has("biografia")) {
        await conn4.execute(
          `ALTER TABLE usuarios
           ADD COLUMN biografia VARCHAR(500) NULL`
        );
      }

      if (!columnasUsuariosExistentes.has("portada_url")) {
        await conn4.execute(
          `ALTER TABLE usuarios
           ADD COLUMN portada_url VARCHAR(500) NULL`
        );
      }

      conn4.release();
    } catch (migErr) {
      console.warn("Advertencia en migración biografia/portada_url de usuarios:", migErr.message);
    }

    try {
      const conn5 = await pool.getConnection();
      const [colsFechaDebut] = await conn5.execute(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'artistas'
           AND COLUMN_NAME  = 'fecha_debut'`
      );
      if (colsFechaDebut[0].cnt === 0) {
        await conn5.execute(
          `ALTER TABLE artistas
           ADD COLUMN fecha_debut DATE NULL`
        );
      }
      conn5.release();
    } catch (migErr) {
      console.warn("Advertencia en migración fecha_debut:", migErr.message);
    }

    try {
      const conn6 = await pool.getConnection();
      const [colsCancionCompartida] = await conn6.execute(
        `SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'mensajes'
           AND COLUMN_NAME  = 'tipo'`
      );
      if (colsCancionCompartida[0].cnt === 0) {
        await conn6.execute(
          `ALTER TABLE mensajes
           ADD COLUMN tipo ENUM('texto', 'cancion') NOT NULL DEFAULT 'texto',
           ADD COLUMN id_cancion INT NULL,
           ADD CONSTRAINT fk_mensajes_cancion
             FOREIGN KEY (id_cancion)
             REFERENCES canciones(id_cancion)
             ON DELETE SET NULL
             ON UPDATE CASCADE`
        );
      }
      conn6.release();
    } catch (migErr) {
      console.warn("Advertencia en migración tipo/id_cancion de mensajes:", migErr.message);
    }

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