CREATE DATABASE IF NOT EXISTS istream
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE istream;

DROP TABLE IF EXISTS canciones_favoritas;
DROP TABLE IF EXISTS historial_reproducciones;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS relaciones_amistad;
DROP TABLE IF EXISTS mensajes;
DROP TABLE IF EXISTS seguidores_usuarios;
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
    perfil_privado BOOLEAN NOT NULL DEFAULT FALSE,
    ultima_actividad TIMESTAMP NULL DEFAULT NULL,
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

CREATE TABLE password_resets (
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
);

CREATE TABLE relaciones_amistad (
    id_relacion BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_emisor INT NOT NULL,
    id_usuario_receptor INT NOT NULL,
    id_usuario_menor INT NOT NULL,
    id_usuario_mayor INT NOT NULL,

    estado ENUM(
        'pendiente',
        'aceptada',
        'rechazada'
    ) NOT NULL DEFAULT 'pendiente',

    respondido_en DATETIME NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    actualizado_en TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

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
);

CREATE TABLE seguidores_usuarios (
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
);

CREATE TABLE mensajes (
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
);

INSERT INTO artistas (nombre, biografia, foto_url, generos, estado) VALUES
('Artista Neon Vox', 'Productor de synthwave y electrónica atmosférica independiente.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80', 'Synthwave, Indie', TRUE),
('Artista Pop Nova', 'Cantante pop con influencias del R&B contemporáneo.', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80', 'Pop, Electrónica', TRUE),
('Artista Ritmo Sur', 'Compositor de música latina y fusión tropical.', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80', 'Latino, Alternativo', TRUE),
('Artista Indie Craft', 'Guitarrista indie con una propuesta auténtica y emotiva.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80', 'Indie, Rock', TRUE),
('Artista Pulso Digital', 'Productor de electrónica y música para videojuegos.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', 'Electrónica, Synthwave', TRUE),
('Artista Ruta Alterna', 'Banda alternativa con letras introspectivas.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', 'Alternativo, Indie', TRUE),
('Artista Roca Viva', 'Grupo de rock con energía y riffs poderosos.', 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&q=80', 'Rock, Pop', TRUE),
('Artista Soul River', 'Vocalista de R&B y soul con influencia jazzística.', 'https://images.unsplash.com/photo-1504704911898-68304a7d2807?w=400&q=80', 'R&B, Soul', TRUE),
('Artista Alma Jazz', 'Pianista de jazz moderno con exploración armónica.', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400&q=80', 'Soul, Jazz', TRUE),
('Artista Beat Flow', 'MC y productor de hip hop underground.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80', 'Hip Hop, Urban', TRUE);

INSERT INTO canciones (id_artista, titulo, artista, album, genero, duracion_segundos, portada_url, audio_url, descripcion, estado) VALUES
(1, 'Horizonte Neon', 'Artista Neon Vox', 'Zeta Sessions', 'Synthwave', 214, 'https://picsum.photos/seed/neon-vox/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'Synthwave con atmósferas futuristas.', TRUE),
(2, 'Marea Pop', 'Artista Pop Nova', 'Nova Vol. 1', 'Pop', 197, 'https://picsum.photos/seed/pop-nova/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'Pop contemporáneo con energía positiva.', TRUE),
(3, 'Cumbia Eléctrica', 'Artista Ritmo Sur', 'Onda Latina', 'Latino', 231, 'https://picsum.photos/seed/ritmo-sur/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'Fusión de cumbia y electrónica.', TRUE),
(4, 'Calles de Colores', 'Artista Indie Craft', 'Resplandor Indie', 'Indie', 188, 'https://picsum.photos/seed/indie-craft/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'Indie con guitarras melancólicas.', TRUE),
(5, 'Código Pulso', 'Artista Pulso Digital', 'Mistline', 'Electrónica', 202, 'https://picsum.photos/seed/pulso-digital/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'Electrónica de alta energía.', TRUE),
(6, 'Deriva Alterna', 'Artista Ruta Alterna', 'Ternario', 'Alternativo', 176, 'https://picsum.photos/seed/ruta-alterna/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'Alternativo introspectivo y melódico.', TRUE),
(7, 'Riff de Acero', 'Artista Roca Viva', 'Kilo Rock', 'Rock', 220, 'https://picsum.photos/seed/roca-viva/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', 'Rock con riffs contundentes.', TRUE),
(8, 'Río Soul', 'Artista Soul River', 'Sombras Soul', 'R&B', 204, 'https://picsum.photos/seed/soul-river/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 'R&B suave con melodías vocales.', TRUE),
(9, 'Camino de Jazz', 'Artista Alma Jazz', 'Vector Jazz', 'Soul', 193, 'https://picsum.photos/seed/alma-jazz/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', 'Jazz moderno con piano prominente.', TRUE),
(10, 'Barrio Beat', 'Artista Beat Flow', 'Radio Hip', 'Hip Hop', 209, 'https://picsum.photos/seed/beat-flow/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', 'Hip hop underground con flow urbano.', TRUE),
(1, 'Neon Drive', 'Artista Neon Vox', 'Zeta Sessions', 'Synthwave', 198, 'https://picsum.photos/seed/neon-vox2/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', 'Synthwave acelerado y electrizante.', TRUE),
(2, 'Luna Brillante', 'Artista Pop Nova', 'Nova Vol. 2', 'Pop', 211, 'https://picsum.photos/seed/pop-nova2/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', 'Balada pop con coros pegajosos.', TRUE),
(3, 'Salsa Urbana', 'Artista Ritmo Sur', 'Onda Latina 2', 'Latino', 225, 'https://picsum.photos/seed/ritmo-sur2/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', 'Salsa moderna con sabor urbano.', TRUE),
(5, 'Frecuencia 404', 'Artista Pulso Digital', 'Glitch World', 'Electrónica', 189, 'https://picsum.photos/seed/pulso-digital2/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', 'Electrónica experimental con glitches.', TRUE),
(7, 'Tormenta de Rock', 'Artista Roca Viva', 'Kilo Rock 2', 'Rock', 237, 'https://picsum.photos/seed/roca-viva2/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', 'Rock intenso con solos de guitarra.', TRUE),
(8, 'Midnight Soul', 'Artista Soul River', 'Deep River', 'R&B', 218, 'https://picsum.photos/seed/soul-river2/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', 'R&B nocturno y sensual.', TRUE),
(10, 'Flow Nocturno', 'Artista Beat Flow', 'Underground', 'Hip Hop', 195, 'https://picsum.photos/seed/beat-flow2/300/300', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3', 'Hip hop con flow lírico y producción oscura.', TRUE);