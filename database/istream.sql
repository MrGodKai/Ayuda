CREATE DATABASE IF NOT EXISTS istream
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE istream;

DROP TABLE IF EXISTS canciones_favoritas;
DROP TABLE IF EXISTS historial_reproducciones;
DROP TABLE IF EXISTS canciones;
DROP TABLE IF EXISTS artistas;
DROP TABLE IF EXISTS usuarios;

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

CREATE TABLE artistas (
    id_artista INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    biografia VARCHAR(500) NULL,
    foto_url VARCHAR(500) NULL,
    generos VARCHAR(255) NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    actualizado_en TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE canciones (
    id_cancion INT AUTO_INCREMENT PRIMARY KEY,
    id_artista INT NULL,
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
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_canciones_artista
        FOREIGN KEY (id_artista)
        REFERENCES artistas(id_artista)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE historial_reproducciones (
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
);

CREATE TABLE canciones_favoritas (
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
);

INSERT INTO artistas (
    nombre,
    biografia,
    foto_url,
    generos,
    estado
)
VALUES
    ('Artista-XA-12', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80', 'Synthwave, Indie', TRUE),
    ('Artista-RB-07', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80', 'Pop, Electrónica', TRUE),
    ('Artista-LM-44', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80', 'Latino, Alternativo', TRUE),
    ('Artista-KP-21', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'Indie, Rock', TRUE),
    ('Artista-CT-18', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80', 'Electrónica, Synthwave', TRUE),
    ('Artista-OR-33', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80', 'Alternativo, Indie', TRUE),
    ('Artista-SF-55', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80', 'Rock, Pop', TRUE),
    ('Artista-NQ-62', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80', 'R&B, Soul', TRUE),
    ('Artista-HJ-77', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80', 'Soul, Pop', TRUE),
    ('Artista-PL-28', 'Perfil público ficticio para pruebas de catálogo.', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80', 'Hip Hop, Urban', TRUE);

INSERT INTO canciones (
    id_artista,
    titulo,
    artista,
    album,
    genero,
    duracion_segundos,
    descripcion,
    estado
)
VALUES
    (1, 'Tema-AX-201', 'Artista-XA-12', 'Álbum-Zeta-03', 'Synthwave', 214, 'Tema ficticio generado para pruebas de catálogo.', TRUE),
    (2, 'Tema-BR-447', 'Artista-RB-07', 'Álbum-Navio-11', 'Pop', 197, 'Registro de prueba con nombre aleatorio.', TRUE),
    (3, 'Tema-LM-650', 'Artista-LM-44', 'Álbum-Onda-17', 'Latino', 231, 'Canción generada para validar contenido de catálogo.', TRUE),
    (4, 'Tema-KP-114', 'Artista-KP-21', 'Álbum-Resplandor-09', 'Indie', 188, 'Contenido ficticio para pruebas internas.', TRUE),
    (5, 'Tema-CT-910', 'Artista-CT-18', 'Álbum-Mistline-04', 'Electrónica', 202, 'Muestra de reproducción sin nombres reales.', TRUE),
    (6, 'Tema-OR-312', 'Artista-OR-33', 'Álbum-Ternario-06', 'Alternativo', 176, 'Registro aleatorio para SQL y UI.', TRUE),
    (7, 'Tema-SF-925', 'Artista-SF-55', 'Álbum-Kilo-22', 'Rock', 220, 'Canción ficticia de ejemplo para el sistema.', TRUE),
    (8, 'Tema-NQ-881', 'Artista-NQ-62', 'Álbum-Sombra-08', 'R&B', 204, 'Dato generado para pruebas del reproductor y buscador.', TRUE),
    (9, 'Tema-HJ-410', 'Artista-HJ-77', 'Álbum-Vector-19', 'Soul', 193, 'Contenido sintético para evaluación del catálogo.', TRUE),
    (10, 'Tema-PL-540', 'Artista-PL-28', 'Álbum-Radio-14', 'Hip Hop', 209, 'Registro semilla de muestra para SQL.', TRUE);