//Convierte un mensaje push (de FCM) en una notificación segura. Módulo puro: lo usa el service worker
//y se prueba con Jest. Nunca se muestra texto ni enlaces tal como llegan: el texto se arma aquí y la URL
//debe estar en una lista blanca del mismo origen.

export const RUTAS_PERMITIDAS = ["/recurrentes", "/plan", "/admin"];
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

//Aviso al cliente de que su mensualidad vence (días: 7 … 0, o -1 si ya venció)
const avisoDePlan = (datos) => {
  const dias = Number.parseInt(datos.dias, 10);
  if (!Number.isInteger(dias) || dias < -1 || dias > 7) return { ...GENERICO, opciones: { body: "Revisa tu plan.", data: { url: "/plan" }, tag: "plan" } };
  const titulo = dias < 0 ? "Tu plan venció" : dias === 0 ? "Tu plan vence hoy" : dias === 1 ? "Tu plan vence mañana" : `Tu plan vence en ${dias} días`;
  const body = dias < 0 ? "Renuévalo para volver a registrar gastos. Tus datos siguen disponibles." : "Renuévalo para seguir registrando gastos sin interrupciones.";
  return { titulo, opciones: { body, data: { url: "/plan" }, tag: "plan" } };
};

//Resumen semanal para el super admin: cuántos planes vencen pronto o ya vencieron
const resumenDePlanes = (datos) => {
  const porVencer = Number.parseInt(datos.porVencer, 10);
  const vencidos = Number.parseInt(datos.vencidos, 10);
  const valido = (n) => Number.isInteger(n) && n >= 0 && n <= 9999;
  const partes = [];
  if (valido(porVencer) && porVencer > 0) partes.push(`${porVencer} por vencer esta semana`);
  if (valido(vencidos) && vencidos > 0) partes.push(`${vencidos} vencidos sin renovar`);
  return { titulo: "Planes de clientes por revisar", opciones: { body: partes.join(" · ") || "Revisa los vencimientos.", data: { url: "/admin" }, tag: "resumen-planes" } };
};

//Devuelve {titulo, opciones} para registration.showNotification. Un mensaje inválido produce un aviso
//genérico: las reglas de Web Push exigen mostrar algo por cada push recibido.
export const armarNotificacion = (carga) => {
  const datos = extraerDatos(carga);
  if (datos && datos.tipo === "plan") return avisoDePlan(datos);
  if (datos && datos.tipo === "resumen-planes") return resumenDePlanes(datos);
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
