//Validaciones sencillas del lado del cliente (Firebase valida de nuevo en el servidor)
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const esCorreoValido = (correo) => CORREO.test(String(correo).trim());

export const errorCorreo = (correo) => {
  if (!String(correo).trim()) return "Escribe tu correo electrónico.";
  if (!esCorreoValido(correo)) return "Escribe un correo válido, por ejemplo nombre@correo.com.";
  return null;
};

export const MIN_CLAVE = 6;
