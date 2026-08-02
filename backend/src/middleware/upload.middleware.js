const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOADS_ROOT = path.join(__dirname, "../../uploads/artistas");
const CARPETA_FOTOS = path.join(UPLOADS_ROOT, "foto");
const CARPETA_PORTADAS = path.join(UPLOADS_ROOT, "portada");

const UPLOADS_ROOT_CANCIONES = path.join(__dirname, "../../uploads/canciones");
const CARPETA_AUDIO = path.join(UPLOADS_ROOT_CANCIONES, "audio");
const CARPETA_PORTADA_CANCION = path.join(UPLOADS_ROOT_CANCIONES, "portada");

[
  CARPETA_FOTOS,
  CARPETA_PORTADAS,
  CARPETA_AUDIO,
  CARPETA_PORTADA_CANCION,
].forEach((carpeta) => {
  fs.mkdirSync(carpeta, { recursive: true });
});

const MIME_PERMITIDOS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function crearStorage(carpetaDestino) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, carpetaDestino);
    },
    filename: (req, file, cb) => {
      const extension = MIME_PERMITIDOS[file.mimetype];
      const idUsuario = req.usuario?.id || "anonimo";

      cb(null, `${idUsuario}-${Date.now()}${extension}`);
    },
  });
}

function filtrarImagen(req, file, cb) {
  if (!MIME_PERMITIDOS[file.mimetype]) {
    return cb(
      new Error(
        "El archivo debe ser una imagen JPG, PNG o WEBP."
      )
    );
  }

  return cb(null, true);
}

const LIMITES = {
  fileSize: 5 * 1024 * 1024,
};

const uploadFotoArtista = multer({
  storage: crearStorage(CARPETA_FOTOS),
  fileFilter: filtrarImagen,
  limits: LIMITES,
});

const uploadPortadaArtista = multer({
  storage: crearStorage(CARPETA_PORTADAS),
  fileFilter: filtrarImagen,
  limits: LIMITES,
});

const MIME_AUDIO_PERMITIDOS = {
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
};

const LIMITES_CANCION = {
  fileSize: 20 * 1024 * 1024,
};

const storageCancion = multer.diskStorage({
  destination: (req, file, cb) => {
    const carpeta =
      file.fieldname === "audio" ? CARPETA_AUDIO : CARPETA_PORTADA_CANCION;

    cb(null, carpeta);
  },
  filename: (req, file, cb) => {
    const extension =
      file.fieldname === "audio"
        ? MIME_AUDIO_PERMITIDOS[file.mimetype]
        : MIME_PERMITIDOS[file.mimetype];

    const idUsuario = req.usuario?.id || "anonimo";

    cb(null, `${idUsuario}-${Date.now()}-${file.fieldname}${extension}`);
  },
});

function filtrarArchivoCancion(req, file, cb) {
  if (file.fieldname === "audio") {
    if (!MIME_AUDIO_PERMITIDOS[file.mimetype]) {
      return cb(
        new Error(
          "El archivo de audio debe ser MP3, WAV, OGG o M4A."
        )
      );
    }

    return cb(null, true);
  }

  if (file.fieldname === "portada") {
    if (!MIME_PERMITIDOS[file.mimetype]) {
      return cb(
        new Error(
          "La portada debe ser una imagen JPG, PNG o WEBP."
        )
      );
    }

    return cb(null, true);
  }

  return cb(new Error("Campo de archivo no reconocido."));
}

const uploadArchivosCancion = multer({
  storage: storageCancion,
  fileFilter: filtrarArchivoCancion,
  limits: LIMITES_CANCION,
}).fields([
  { name: "audio", maxCount: 1 },
  { name: "portada", maxCount: 1 },
]);

function rutaPublicaAudioCancion(nombreArchivo) {
  return `/uploads/canciones/audio/${nombreArchivo}`;
}

function rutaPublicaPortadaCancion(nombreArchivo) {
  return `/uploads/canciones/portada/${nombreArchivo}`;
}

function rutaPublicaFoto(nombreArchivo) {
  return `/uploads/artistas/foto/${nombreArchivo}`;
}

function rutaPublicaPortada(nombreArchivo) {
  return `/uploads/artistas/portada/${nombreArchivo}`;
}

function eliminarArchivoPublico(rutaPublica) {
  if (!rutaPublica || !rutaPublica.startsWith("/uploads/")) {
    return;
  }

  const rutaAbsoluta = path.join(
    __dirname,
    "../..",
    rutaPublica
  );

  fs.unlink(rutaAbsoluta, () => {
    // Falla silenciosa: el archivo pudo no existir.
  });
}

function manejarErroresUpload(middlewareMulter) {
  return (req, res, next) => {
    middlewareMulter(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          mensaje:
            error.message ||
            "No se pudo procesar el archivo enviado.",
        });
      }

      return next();
    });
  };
}

module.exports = {
  uploadFotoArtista,
  uploadPortadaArtista,
  uploadArchivosCancion,
  rutaPublicaFoto,
  rutaPublicaPortada,
  rutaPublicaAudioCancion,
  rutaPublicaPortadaCancion,
  eliminarArchivoPublico,
  manejarErroresUpload,
};
