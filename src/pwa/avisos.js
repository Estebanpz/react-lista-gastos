//Convierte un mensaje push (de FCM) en una notificación segura. Módulo puro: lo usa el service worker
//y se prueba con Jest. Nunca se muestra texto ni enlaces tal como llegan: el texto se arma aquí y la URL
//debe estar en una lista blanca del mismo origen.

export const RUTAS_PERMITIDAS = ["/recurrentes"];
export const RUTA_POR_DEFECTO = "/recurrentes";
const MAX_DETALLE = 120;

const GENERICO = {
  titulo: "Finanzas",
  opciones: { body: "Tienes pagos por revisar.", data: { url: RUTA_POR_DEFECTO } },
};

//FCM entrega `{data: {...}, from, fcmMessageId…}`; se acepta también el objeto de datos directo
const extraerDatos = (carga) => {
  if (!carga || typeof carga !== "object") return null;
  const datos = carga.data && typeof carga.data === "object" ? carga.data : carga;
  return datos;
};

//Solo texto plano, sin saltos de línea ni caracteres de control, recortado
//(la regex busca a propósito caracteres de control para quitarlos)
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;
const limpiarTexto = (texto) =>
  typeof texto === "string" ? texto.replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, MAX_DETALLE) : "";

//Ruta relativa permitida (sin dominio, sin `//`, sin parámetros que redirijan)
export const rutaSegura = (url) => (typeof url === "string" && RUTAS_PERMITIDAS.includes(url) ? url : RUTA_POR_DEFECTO);

//Devuelve {titulo, opciones} para registration.showNotification. Un mensaje inválido produce un aviso
//genérico: las reglas de Web Push exigen mostrar algo por cada push recibido.
export const armarNotificacion = (carga) => {
  const datos = extraerDatos(carga);
  if (!datos || datos.tipo !== "recordatorio") return GENERICO;
  const cantidad = Number.parseInt(datos.cantidad, 10);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return GENERICO;

  const titulo = cantidad === 1 ? "Tienes un pago próximo" : `Tienes ${cantidad} pagos próximos`;
  const detalle = limpiarTexto(datos.detalle);
  return {
    titulo,
    opciones: {
      body: detalle || "Ábrela para ver cuándo vencen y registrar el pago.",
      data: { url: rutaSegura(datos.url), cantidad },
    },
  };
};

//Opciones visuales comunes (iconos propios; `tag` reemplaza el aviso anterior en vez de apilarlos)
export const OPCIONES_BASE = {
  icon: "/icono-192.png",
  badge: "/insignia-96.png",
  tag: "recordatorios",
  lang: "es-CO",
  renotify: true,
};

//Destino absoluto al tocar la notificación: siempre del mismo origen que el service worker
export const destinoAlTocar = (datos, origen) => {
  const url = new URL(rutaSegura(datos && datos.url), origen);
  return url.origin === origen ? url.href : new URL(RUTA_POR_DEFECTO, origen).href;
};
