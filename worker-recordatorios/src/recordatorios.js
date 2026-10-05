//Ciclo diario: busca pagos que vencen en 3 días o hoy, agrupa por persona y envía UN aviso por persona.
//Comparte el cálculo de fechas con la app (src/functions/recurrencias.js).
import { avisoPendiente, claveAviso, hoyEnZona, sumarDias, ZONA_POR_DEFECTO } from "../../src/functions/recurrencias.js";
import { obtenerAccessToken } from "./google.js";
import { pagosEnVentana, perfiles, todosLosTokens, confirmar } from "./firestore.js";
import { enviarPush } from "./fcm.js";

//Límites del plan Free de Workers: 50 subrequests por ejecución (4 fijas + 1 por envío + 1 de confirmación)
export const MAX_ENVIOS = 35;
export const MAX_TOKENS_POR_PERSONA = 10;
export const MAX_PAGOS_POR_PERSONA = 100;
const DIAS_MAX_TOKEN = 270; //FCM da por inactivo un token sin renovar en ~270 días
const MAX_DETALLE = 120;

const diasDesde = (iso, ahora) => (ahora.getTime() - new Date(iso).getTime()) / 86400000;

//Texto opcional con las descripciones (nunca montos); solo si la persona lo activó
const armarDetalle = (pagos) => pagos.map((p) => p.descripcion).join(", ").slice(0, MAX_DETALLE);

export const ejecutar = async (env, { fetch: pedir = fetch, ahora = new Date() } = {}) => {
  const resumen = { personas: 0, avisos: 0, enviados: 0, tokensBorrados: 0, omitidos: 0 };
  const cuenta = JSON.parse(env.GOOGLE_SA_JSON);
  const accessToken = await obtenerAccessToken(cuenta, { fetch: pedir, ahoraSeg: Math.floor(ahora.getTime() / 1000) });

  //Ventana amplia en UTC (cubre cualquier zona horaria); el filtro exacto se hace con la fecha local de cada persona
  const hoyUTC = hoyEnZona("UTC", ahora);
  const pagos = await pagosEnVentana(env, accessToken, pedir, sumarDias(hoyUTC, -1), sumarDias(hoyUTC, 4));
  const porPersona = new Map();
  for (const p of pagos) {
    if (!porPersona.has(p.uidUsuario)) porPersona.set(p.uidUsuario, []);
    if (porPersona.get(p.uidUsuario).length < MAX_PAGOS_POR_PERSONA) porPersona.get(p.uidUsuario).push(p);
  }
  if (!porPersona.size) return resumen;

  const datosPerfil = await perfiles(env, accessToken, pedir, [...porPersona.keys()]);
  const pendientes = [];
  for (const [uid, lista] of porPersona) {
    const hoy = hoyEnZona(datosPerfil[uid]?.zona || ZONA_POR_DEFECTO, ahora);
    const avisos = lista.map((p) => ({ pago: p, tipo: avisoPendiente(p, hoy) })).filter((a) => a.tipo);
    if (avisos.length) pendientes.push({ uid, avisos, detalle: !!datosPerfil[uid]?.detalleEnAviso });
  }
  if (!pendientes.length) return resumen;

  const tokens = await todosLosTokens(env, accessToken, pedir);
  const confirmados = [];
  const aBorrar = [];
  let envios = 0;
  for (const { uid, avisos, detalle } of pendientes) {
    resumen.personas++;
    resumen.avisos += avisos.length;
    const vigentes = [];
    for (const t of tokens.filter((x) => x.uid === uid).sort((a, b) => (a.actualizado < b.actualizado ? 1 : -1))) {
      if (vigentes.length >= MAX_TOKENS_POR_PERSONA || diasDesde(t.actualizado, ahora) > DIAS_MAX_TOKEN) { aBorrar.push(t.ruta); continue; }
      vigentes.push(t);
    }
    const datos = { tipo: "recordatorio", cantidad: String(avisos.length), url: "/recurrentes" };
    if (detalle) datos.detalle = armarDetalle(avisos.map((a) => a.pago));
    let llego = false;
    for (const t of vigentes) {
      if (envios >= MAX_ENVIOS) { resumen.omitidos++; continue; }
      envios++;
      const r = await enviarPush(env, accessToken, pedir, t.token, datos);
      if (r.ok) { llego = true; resumen.enviados++; } else if (r.invalido) aBorrar.push(t.ruta);
    }
    //Solo se marca como avisado si al menos un dispositivo lo recibió: si no, mañana no se «gasta» el aviso
    if (llego) confirmados.push(...avisos.map(({ pago, tipo }) => ({ ruta: pago.ruta, clave: claveAviso(pago, tipo) })));
  }
  resumen.tokensBorrados = aBorrar.length;
  await confirmar(env, accessToken, pedir, { avisos: confirmados, tokensABorrar: aBorrar });
  return resumen;
};
