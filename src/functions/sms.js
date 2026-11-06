//Textos y validaciones del SMS de recordatorio del día del pago. Módulo puro y sin dependencias: lo usan la app (validar el
//celular, saber si toca pedir cancelación) y el Worker (armar el SMS). Lección de ZF Manager: un SMS cuesta 1 crédito por cada
//160 caracteres GSM-7, y una sola «á», «í», «ó» o «ú» lo pasa a UCS-2 (70 caracteres, el doble de créditos). Por eso todo texto
//pasa por aGsm7. La ñ sí cabe en GSM-7.

export const CELULAR_VALIDO = /^\+573[0-9]{9}$/;
export const LARGO_SMS = 160;
export const URL_SMS = "finanzas.zfmanager.com/recurrentes";

//Celular de Colombia escrito como sea («300 123 4567», «573001234567», «+57 300…») → «+573001234567»; si no, null
export const normalizarCelular = (texto) => {
  const digitos = String(texto || "").replace(/\D/g, "");
  const local = digitos.length === 12 && digitos.startsWith("57") ? digitos.slice(2) : digitos;
  return /^3[0-9]{9}$/.test(local) ? `+57${local}` : null;
};

//Quita tildes (conserva ñ y Ñ) y todo lo que no sea letra, número, espacio o puntuación básica
export const aGsm7 = (texto) =>
  String(texto || "")
    .replace(/ñ/g, "\uE000")
    .replace(/Ñ/g, "\uE001")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uE000/g, "ñ")
    .replace(/\uE001/g, "Ñ")
    .replace(/[^A-Za-z0-9ñÑ .,:;!?()+/-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

//Texto del SMS (máx. 160). Con `conDetalle` lleva las descripciones de los pagos (recortadas con «...» si no caben).
export const textoSms = (pagos, conDetalle) => {
  const n = pagos.length;
  const cola = ` Registra${n === 1 ? "lo" : "los"} en ${URL_SMS}`;
  if (conDetalle) {
    const nombres = aGsm7(pagos.map((p) => p.descripcion).join(", "));
    const cabeza = n === 1 ? "Hoy vence tu gasto fijo " : "Hoy vencen tus gastos fijos: ";
    const espacio = LARGO_SMS - cabeza.length - cola.length - 1;
    if (nombres && espacio >= 6) {
      const corto = nombres.length > espacio ? `${nombres.slice(0, espacio - 3).trim()}...` : nombres;
      return `${cabeza}${corto}.${cola}`;
    }
  }
  return n === 1 ? `Hoy vence 1 gasto fijo en Finanzas.${cola}` : `Hoy vencen ${n} gastos fijos en Finanzas.${cola}`;
};

//Remitente (tpoa): el nombre del cliente, solo letras y números, máx. 11 (estándar SMS). Sin nombre: «Finanzas».
export const remitenteSms = (nombre) => {
  const limpio = aGsm7(nombre).replace(/ñ/g, "n").replace(/Ñ/g, "N").replace(/[^A-Za-z0-9]/g, "");
  return limpio.slice(0, 11) || "Finanzas";
};

//Identificador del SMS en LabsMobile (máx. 20): «f» + 11 primeros caracteres del uid + fecha sin guiones. Fijo por persona
//y día, así el Worker lo puede recalcular para cancelarlo.
export const subidSms = (uid, fecha) => `f${String(uid).slice(0, 11)}${fecha.replace(/-/g, "")}`;

//¿Puede haber un SMS programado sin salir todavía? Entre las 8:00 y las 8:30 de Colombia (lo programa el cron de las 8:00)
export const enVentanaDeCancelacion = (ahora = new Date()) => {
  const minutos = (ahora.getUTCHours() * 60 + ahora.getUTCMinutes() - 300 + 1440) % 1440;
  return minutos >= 8 * 60 && minutos < 8 * 60 + 30;
};
