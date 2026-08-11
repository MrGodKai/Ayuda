function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.addEventListener("load", () => resolve(imagen));
    imagen.addEventListener("error", reject);
    imagen.crossOrigin = "anonymous";
    imagen.src = url;
  });
}

export async function obtenerImagenRecortada(imagenUrl, areaRecortePx, anchoSalida, altoSalida) {
  const imagen = await cargarImagen(imagenUrl);

  const canvas = document.createElement("canvas");
  canvas.width = anchoSalida;
  canvas.height = altoSalida;

  const contexto = canvas.getContext("2d");
  contexto.drawImage(
    imagen,
    areaRecortePx.x,
    areaRecortePx.y,
    areaRecortePx.width,
    areaRecortePx.height,
    0,
    0,
    anchoSalida,
    altoSalida
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen recortada."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
}
