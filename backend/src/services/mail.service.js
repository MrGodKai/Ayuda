const nodemailer = require("nodemailer");

const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASSWORD = String(process.env.SMTP_PASSWORD || "").trim();
const SMTP_FROM = String(process.env.SMTP_FROM || "").trim();
const SMTP_SECURE =
  String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true" ||
  SMTP_PORT === 465;

let transporter = null;

function correoHabilitado() {
  return Boolean(
    SMTP_HOST &&
      Number.isFinite(SMTP_PORT) &&
      SMTP_PORT > 0 &&
      SMTP_USER &&
      SMTP_PASSWORD &&
      SMTP_FROM
  );
}

function obtenerTransporter() {
  if (!correoHabilitado()) {
    throw new Error("La configuración SMTP está incompleta.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,

      // Forzar IPv4
      family: 4,

      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
      requireTLS: !SMTP_SECURE,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  return transporter;
}

async function enviarCorreo({ to, subject, text, html }) {
  const clienteCorreo = obtenerTransporter();

  return clienteCorreo.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  enviarCorreo,
  correoHabilitado,
};
