//SMS del día del pago por LabsMobile (https://www.labsmobile.com/es/api-sms/versiones-api/http-rest-post-json).
//Lección de ZF Manager (zona-fit-backend/src/enviarSMS.js): LabsMobile responde HTTP 200 TAMBIÉN cuando rechaza; solo
//`code === "0"` es aceptado. Por eso enviarSms lanza ante cualquier otro código y el cron solo marca `ultimoSms` si no hubo
//excepción: el reintento sale solo en el siguiente turno. Los registros nunca llevan números, nombres ni textos.
//Credenciales: secretos LABS_MOBILE_USER (correo de la cuenta) y LABS_MOBILE_TOKEN (wrangler secret put), nunca en el repo.
import { puedeEscribir } from "../../src/functions/planes.js";
import { hoyEnZona, ZONA_POR_DEFECTO } from "../../src/functions/recurrencias.js";
import { CELULAR_VALIDO, textoSms, remitenteSms, subidSms } from "../../src/functions/sms.js";
import { leerDocumentoPorRuta, pagosActivosDelDia, confirmar } from "./firestore.js";

const base = (env) => env.LABSMOBILE_BASE || "https://api.labsmobile.com";
//8:30 a. m. en Colombia (UTC-5, sin horario de verano). LabsMobile pide `scheduled` en GMT.
export const HORA_SMS_GMT = "13:30:00";

export const hayCredencialesSms = (env) => Boolean(env.LABS_MOBILE_USER && env.LABS_MOBILE_TOKEN);

const llamarLabs = async (env, pedir, camino, cuerpo) => {
  const respuesta = await pedir(`${base(env)}${camino}`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${env.LABS_MOBILE_USER}:${env.LABS_MOBILE_TOKEN}`)}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  let datos = {};
  try { datos = await respuesta.json(); } catch { /* sin JSON */ }
  return { respuesta, datos };
};

//Envía (o programa, con `programado` = «AAAA-MM-DD HH:MM:SS» GMT) un SMS. Lanza si LabsMobile no lo acepta.
export const enviarSms = async (env, pedir, { numero, mensaje, remitente, subid, programado }) => {
  const cuerpo = { message: mensaje, tpoa: remitente, recipient: [{ msisdn: numero }], subid, label: "finanzas-recordatorio" };
  if (programado) cuerpo.scheduled = programado;
  const { respuesta, datos } = await llamarLabs(env, pedir, "/json/send", cuerpo);
  if (!respuesta.ok || String(datos.code) !== "0") {
    const error = new Error(`LabsMobile no aceptó el SMS (HTTP ${respuesta.status}, code ${datos.code})`);
    error.estadoHttp = respuesta.status;
    error.codigoLabsMobile = String(datos.code ?? "");
    throw error;
  }
  return datos;
};

//Cancela un SMS programado con el MISMO subid con que se programó (confirmado por LabsMobile). Nunca con "*": cancelaría los
//pendientes de toda la cuenta. code 52 («no encontrado»: ya salió o ya se canceló) también cuenta como hecho.
export const cancelarSmsProgramado = async (env, pedir, subid) => {
  if (!subid || subid === "*") return false;
  const { datos } = await llamarLabs(env, pedir, "/json/scheduled", { cmd: "cancel", subid });
  return ["0", "52"].includes(String(datos.code));
};

//¿Toca SMS a esta persona? Devuelve {envio, marca} o null. Antes de las 8:30 (turno null) se PROGRAMA para las 8:30;
//desde las 8:30, si no salió (falló la corrida de las 8:00), se envía YA. Una vez por persona y día (`ultimoSms`).
export const smsPendiente = ({ perfil, cliente, pagosHoy, hoy, ahora, turno }) => {
  if (!pagosHoy.length || !perfil || perfil.smsActivo !== true || !CELULAR_VALIDO.test(perfil.celular || "")) return null;
  if (!cliente || !puedeEscribir({ ...cliente, vence: Date.parse(cliente.vence) }, ahora.getTime())) return null;
  if (typeof cliente.ultimoSms === "string" && cliente.ultimoSms.startsWith(`${hoy}|`)) return null;
  const subid = subidSms(cliente.id, hoy);
  const envio = { numero: perfil.celular.slice(1), mensaje: textoSms(pagosHoy, perfil.detalleEnAviso === true), remitente: remitenteSms(cliente.nombre), subid };
  if (turno === null) envio.programado = `${hoy} ${HORA_SMS_GMT}`;
  return { envio, marca: { ruta: cliente.ruta, clave: `${hoy}|${subid}`, campo: "ultimoSms" } };
};

//POST /sms/revisar: tras registrar, omitir, pausar o borrar un gasto fijo, si el SMS de hoy sigue programado (antes de las 8:30)
//y ya no queda ningún pago activo que venza hoy, se cancela. Devuelve "cancelado" | "sigue" | "nada".
export const revisarSmsProgramado = async (env, accessToken, pedir, uid, ahora) => {
  if (!hayCredencialesSms(env)) return "nada";
  const hoy = hoyEnZona(ZONA_POR_DEFECTO, ahora);
  if (ahora.getTime() >= Date.parse(`${hoy}T${HORA_SMS_GMT}Z`)) return "nada"; //ya salió
  const cliente = await leerDocumentoPorRuta(env, accessToken, pedir, `clientes/${uid}`);
  if (!cliente || typeof cliente.ultimoSms !== "string") return "nada";
  const [fecha, subid] = cliente.ultimoSms.split("|");
  if (fecha !== hoy || !subid || subid === "cancelado") return "nada";
  if ((await pagosActivosDelDia(env, accessToken, pedir, uid, hoy)).length) return "sigue";
  if (!(await cancelarSmsProgramado(env, pedir, subid))) return "sigue";
  await confirmar(env, accessToken, pedir, { avisos: [{ ruta: cliente.ruta, clave: `${hoy}|cancelado`, campo: "ultimoSms" }], tokensABorrar: [] });
  return "cancelado";
};
