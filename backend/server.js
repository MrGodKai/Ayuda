require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./src/config/db");
const authRoutes = require("./src/routes/auth.routes");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      mensaje: "Backend y base de datos funcionando correctamente.",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "No se pudo conectar con MySQL.",
    });
  }
});

app.use("/api/auth", authRoutes);

app.use((req, res) => {
  res.status(404).json({
    mensaje: "Ruta no encontrada.",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});