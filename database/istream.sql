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
DROP TABLE IF EXISTS playlist_canciones;
DROP TABLE IF EXISTS playlists;
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
    portada_url VARCHAR(500) NULL,
    biografia VARCHAR(500) NULL,
    telefono VARCHAR(30) NULL,
    ciudad VARCHAR(100) NULL,
    perfil_privado BOOLEAN NOT NULL DEFAULT FALSE,
    ultima_actividad TIMESTAMP NULL DEFAULT NULL,

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
    fecha_debut DATE NULL,
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

CREATE TABLE playlists (
    id_playlist INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500) NULL,
    portada_url VARCHAR(500) NULL,
    publica BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    actualizado_en TIMESTAMP
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_playlists_usuario (id_usuario, creado_en),

    CONSTRAINT fk_playlists_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE playlist_canciones (
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
    tipo ENUM('texto', 'cancion') NOT NULL DEFAULT 'texto',
    id_cancion INT NULL,
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
        ON UPDATE CASCADE,

    CONSTRAINT fk_mensajes_cancion
        FOREIGN KEY (id_cancion)
        REFERENCES canciones(id_cancion)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

INSERT INTO artistas (nombre, biografia, foto_url, generos, estado) VALUES
(
  'Kevin MacLeod',
  'Compositor estadounidense conocido por su colección de más de 2000 pistas musicales libres de derechos. Sus obras abarcan Electronic, Jazz, World Music y Soundtrack, todas bajo licencia Creative Commons CC BY 4.0.',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Kevin_MacLeod_%28headshot%29.jpg/220px-Kevin_MacLeod_%28headshot%29.jpg',
  'Electronic, Soundtrack, Jazz, World, Easy Listening',
  TRUE
),
(
  'Komiku',
  'Artista de música libre que publica todos sus álbumes bajo licencia CC0 (Dominio Público). Sus composiciones abarcan Folk, Chiptune y Soundtrack, ideales para videojuegos, cine y proyectos creativos.',
  'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
  'Folk, Soundtrack, Chiptune, Instrumental',
  TRUE
);

INSERT INTO canciones
  (id_artista, titulo, artista, album, genero, duracion_segundos, portada_url, audio_url, descripcion, estado)
VALUES
-- Kevin MacLeod – Ferret (2017)
(1, 'Android Sock Hop', 'Kevin MacLeod', 'Ferret', 'Soft Rock', 285,
 'https://picsum.photos/seed/km-ferret/300/300',
 'https://archive.org/download/Kevin-MacLeod_Ferret_2017_FullAlbum/Ferret/Kevin%20MacLeod%20-%2001%20-%20Android%20Sock%20Hop.mp3',
 'Pista de Soft Rock del álbum Ferret. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Robobozo', 'Kevin MacLeod', 'Ferret', 'Electronic', 206,
 'https://picsum.photos/seed/km-ferret/300/300',
 'https://archive.org/download/Kevin-MacLeod_Ferret_2017_FullAlbum/Ferret/Kevin%20MacLeod%20-%2002%20-%20Robobozo.mp3',
 'Electrónica retro del álbum Ferret. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Zazie', 'Kevin MacLeod', 'Ferret', 'Easy Listening', 213,
 'https://picsum.photos/seed/km-ferret/300/300',
 'https://archive.org/download/Kevin-MacLeod_Ferret_2017_FullAlbum/Ferret/Kevin%20MacLeod%20-%2003%20-%20Zazie.mp3',
 'Easy Listening del álbum Ferret. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Teddy Bear Waltz', 'Kevin MacLeod', 'Ferret', 'Soundtrack', 195,
 'https://picsum.photos/seed/km-ferret/300/300',
 'https://archive.org/download/Kevin-MacLeod_Ferret_2017_FullAlbum/Ferret/Kevin%20MacLeod%20-%2005%20-%20Teddy%20Bear%20Waltz.mp3',
 'Vals cinematográfico del álbum Ferret. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Cheery Monday', 'Kevin MacLeod', 'Ferret', 'Easy Listening', 80,
 'https://picsum.photos/seed/km-ferret/300/300',
 'https://archive.org/download/Kevin-MacLeod_Ferret_2017_FullAlbum/Ferret/Kevin%20MacLeod%20-%2006%20-%20Cheery%20Monday.mp3',
 'Pista alegre del álbum Ferret. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Jerry Five', 'Kevin MacLeod', 'Ferret', 'Electronic', 160,
 'https://picsum.photos/seed/km-ferret/300/300',
 'https://archive.org/download/Kevin-MacLeod_Ferret_2017_FullAlbum/Ferret/Kevin%20MacLeod%20-%2007%20-%20Jerry%20Five.mp3',
 'Electronic del álbum Ferret. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Industrious Ferret', 'Kevin MacLeod', 'Ferret', 'Soundtrack', 217,
 'https://picsum.photos/seed/km-ferret/300/300',
 'https://archive.org/download/Kevin-MacLeod_Ferret_2017_FullAlbum/Ferret/Kevin%20MacLeod%20-%2008%20-%20Industrious%20Ferret.mp3',
 'Soundtrack del álbum Ferret. Kevin MacLeod – CC BY 4.0.', TRUE),
-- Kevin MacLeod – Vadodara (2014)
(1, 'Asian Drums', 'Kevin MacLeod', 'Vadodara', 'Soundtrack', 139,
 'https://picsum.photos/seed/km-vadodara/300/300',
 'https://archive.org/download/Kevin-MacLeod_Utility_Vadodara_2014_FullAlbum/Vadodara/Kevin%20MacLeod%20-%2001%20-%20Asian%20Drums.mp3',
 'Percusiones asiáticas del álbum Vadodara. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Balzan Groove', 'Kevin MacLeod', 'Vadodara', 'World', 125,
 'https://picsum.photos/seed/km-vadodara/300/300',
 'https://archive.org/download/Kevin-MacLeod_Utility_Vadodara_2014_FullAlbum/Vadodara/Kevin%20MacLeod%20-%2002%20-%20Balzan%20Groove.mp3',
 'Groove mundial del álbum Vadodara. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Big Mojo', 'Kevin MacLeod', 'Vadodara', 'World', 157,
 'https://picsum.photos/seed/km-vadodara/300/300',
 'https://archive.org/download/Kevin-MacLeod_Utility_Vadodara_2014_FullAlbum/Vadodara/Kevin%20MacLeod%20-%2003%20-%20Big%20Mojo.mp3',
 'World Music del álbum Vadodara. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Desert City', 'Kevin MacLeod', 'Vadodara', 'World', 89,
 'https://picsum.photos/seed/km-vadodara/300/300',
 'https://archive.org/download/Kevin-MacLeod_Utility_Vadodara_2014_FullAlbum/Vadodara/Kevin%20MacLeod%20-%2007%20-%20Desert%20City.mp3',
 'Ambiente de ciudad desértica del álbum Vadodara. Kevin MacLeod – CC BY 4.0.', TRUE),
(1, 'Eastern Thought', 'Kevin MacLeod', 'Vadodara', 'World', 262,
 'https://picsum.photos/seed/km-vadodara/300/300',
 'https://archive.org/download/Kevin-MacLeod_Utility_Vadodara_2014_FullAlbum/Vadodara/Kevin%20MacLeod%20-%2010%20-%20Eastern%20Thought.mp3',
 'Meditación oriental del álbum Vadodara. Kevin MacLeod – CC BY 4.0.', TRUE),
-- Kevin MacLeod – Single
(1, 'Stringed Disco', 'Kevin MacLeod', 'Disco and Lounge', 'Disco', 175,
 'https://picsum.photos/seed/km-disco/300/300',
 'https://archive.org/download/kevin-macleod-stringed-disco/Kevin%20MacLeod%20-%20Stringed%20Disco.mp3',
 'Disco funky con cuerdas. Kevin MacLeod – CC BY 4.0.', TRUE),
-- Komiku – Poupi's incredible adventures ! (CC0)
(2, 'Cat City', 'Komiku', "Poupi's incredible adventures !", 'Folk', 128,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_15_-_Cat_City.mp3',
 'Música de la Ciudad de los Gatos. Komiku – CC0.', TRUE),
(2, 'Swimming with the Fish', 'Komiku', "Poupi's incredible adventures !", 'Folk', 172,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_39_-_Swimming_with_the_fish.mp3',
 'Ambiente submarino relajante. Komiku – CC0.', TRUE),
(2, 'Love Planet', 'Komiku', "Poupi's incredible adventures !", 'Folk', 80,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_32_-_Love_Planet.mp3',
 'El Planeta Amor en versión chiptune. Komiku – CC0.', TRUE),
(2, 'Serenity Temple', 'Komiku', "Poupi's incredible adventures !", 'Folk', 96,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_34_-_Serenity_Temple.mp3',
 'El templo de la serenidad. Komiku – CC0.', TRUE),
(2, 'Travel to the Horizon', 'Komiku', "Poupi's incredible adventures !", 'Folk', 96,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_43_-_Travel_to_the_Horizon.mp3',
 'Viaje hacia el horizonte. Komiku – CC0.', TRUE),
(2, 'The Horizon', 'Komiku', "Poupi's incredible adventures !", 'Folk', 65,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_45_-_The_Horizon.mp3',
 'El horizonte al atardecer. Komiku – CC0.', TRUE),
(2, 'The Beach', 'Komiku', "Poupi's incredible adventures !", 'Folk', 77,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_47_-_The_Beach.mp3',
 'La playa tranquila. Komiku – CC0.', TRUE),
(2, 'Quiet Saturday', 'Komiku', "Poupi's incredible adventures !", 'Folk', 113,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_57_-_Quiet_Saturday.mp3',
 'Un sábado tranquilo en casa de la abuela. Komiku – CC0.', TRUE),
(2, 'Cave of Time', 'Komiku', "Poupi's incredible adventures !", 'Folk', 166,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_52_-_Cave_of_time.mp3',
 'La cueva del tiempo, tensa y misteriosa. Komiku – CC0.', TRUE),
(2, 'Escaping like Indiana Jones', 'Komiku', "Poupi's incredible adventures !", 'Folk', 96,
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/a0606555560_16.jpg',
 'https://archive.org/download/Komiku-Poupis_incredible_adventures/Komiku_-_54_-_Escaping_like_Indiana_Jones.mp3',
 'Huida épica estilo Indiana Jones. Komiku – CC0.', TRUE);