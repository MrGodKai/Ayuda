CREATE DATABASE IF NOT EXISTS istream
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE istream;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol ENUM('usuario', 'artista', 'administrador')
        NOT NULL DEFAULT 'usuario',
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);