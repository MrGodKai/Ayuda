CREATE DATABASE IF NOT EXISTS istream
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE istream;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,

    rol ENUM(
        'usuario',
        'artista',
        'administrador'
    ) NOT NULL DEFAULT 'usuario',

    estado BOOLEAN NOT NULL DEFAULT TRUE,
    foto_perfil VARCHAR(500) NULL,
    telefono VARCHAR(30) NULL,
    ciudad VARCHAR(100) NULL,

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    actualizado_en TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE canciones (
    id_cancion INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    artista VARCHAR(150) NOT NULL,
    album VARCHAR(150) NULL,
    genero VARCHAR(100) NULL,
    duracion_segundos INT NULL,
    portada_url VARCHAR(500) NULL,
    audio_url VARCHAR(500) NULL,
    descripcion VARCHAR(500) NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    actualizado_en TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);