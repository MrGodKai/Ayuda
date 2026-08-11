import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { obtenerImagenRecortada } from "../utils/recortarImagen";

function RecortarImagenModal({
  imagenUrl,
  aspecto,
  anchoSalida,
  altoSalida,
  forma = "rect",
  titulo,
  onCancelar,
  onConfirmar,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaRecortePx, setAreaRecortePx] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  const manejarRecorteCompleto = useCallback((_areaRecorte, areaRecortePxNueva) => {
    setAreaRecortePx(areaRecortePxNueva);
  }, []);

  const confirmar = async () => {
    if (!areaRecortePx) {
      return;
    }

    try {
      setProcesando(true);
      setMensajeError("");

      const blob = await obtenerImagenRecortada(imagenUrl, areaRecortePx, anchoSalida, altoSalida);

      onConfirmar(blob);
    } catch (error) {
      setMensajeError("No se pudo recortar la imagen. Probá de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="crop-modal-backdrop">
      <div className="crop-modal-card">
        <h3>{titulo}</h3>
        <p className="crop-modal-hint">Arrastrá para mover la imagen y usá el control para hacer zoom.</p>

        <div className="crop-modal-stage">
          <Cropper
            image={imagenUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspecto}
            cropShape={forma}
            showGrid={forma === "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={manejarRecorteCompleto}
          />
        </div>

        <div className="crop-modal-zoom-row">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="volume-slider"
            aria-label="Zoom de la imagen"
          />
        </div>

        {mensajeError && <p className="form-error">{mensajeError}</p>}

        <div className="crop-modal-actions">
          <button type="button" className="secondary-link-button" onClick={onCancelar} disabled={procesando}>
            Cancelar
          </button>
          <button type="button" className="save-button" onClick={confirmar} disabled={procesando}>
            {procesando ? "Procesando..." : "Usar esta imagen"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecortarImagenModal;
