//Ciclo diario con dos tipos de aviso, ambos por push:
//  1) pagos recurrentes que vencen en 3 días o hoy (UN aviso por persona);
//  2) planes de los clientes (la mensualidad de Finanzas): al cliente cuando le faltan 7, 3 o 0 días y al vencer, y un resumen
//     semanal al super admin. Ver planes.js.
//Comparte el cálculo de fechas con la app (src/functions/recurrencias.js y planes.js).
import { avisoPendiente, claveAviso, hoyEnZona, sumarDias, ZONA_POR_DEFECTO } from "../../src/functions/recurrencias.js";
import { obtenerAccessToken } from "./google.js";
import { pagosEnVentana, perfiles, todosLosTokens, todosLosClientes, superAdmins, confirmar } from "./firestore.js";
import { enviarPush } from "./fcm.js";
import { avisosAClientes, resumenParaAdmins } from "./planes.js";

//Límites del plan Free de Workers: 50 subrequests por ejecución (6 fijas + 1 por envío + 1 de confirmación)
export const MAX_ENVIOS = 35;
export const MAX_TOKENS_POR_PERSONA = 10;
export const MAX_PAGOS_POR_PERSONA = 100;
const DIAS_MAX_TOKEN = 270; //FCM da por inactivo un token sin renovar en ~270 días
const MAX_DETALLE = 120;

const diasDesde = (iso, ahora) => (ahora.getTime() - new Date(iso).getTime()) / 86400000;

//Texto opcional con las descripciones (nunca montos); solo si la persona lo activó
const armarDetalle = (pagos) => pagos.map((p) => p.descripcion).join(", ").slice(0, MAX_DETALLE);

export const ejecutar = async (env, { fetch: pedir = fetch, ahora = new Date() } = {}) => {
  const resumen = { personas: 0, avisos: 0, enviados: 0, tokensBorrados: 0, omitidos: 0, avisosPlan: 0, resumenesAdmin: 0 };
  const cuenta = JSON.parse(env.GOOGLE_SA_JSON);
  const accessToken = await obtenerAccessToken(cuenta, { fetch: pedir, ahoraSeg: Math.floor(ahora.getTime() / 1000) });

  //Ventana amplia en UTC (cubre cualquier zona horaria); el filtro exacto se hace con la fecha local de cada persona
  const hoyUTC = hoyEnZona("UTC", ahora);
  const pagos = await pagosEnVentana(env, accessToken, pedir, sumarDias(hoyUTC, -1), sumarDias(hoyUTC, 4));
  const clientes = await todosLosClientes(env, accessToken, pedir);
  const admins = await superAdmins(env, accessToken, pedir);

  //Destinatarios: cada uno con su mensaje y las marcas que se escriben si llegó a algún dispositivo
  const destinos = [];
  const limitePorPersona = new Map(clientes.map((c) => [c.id, Number.isInteger(c.limites?.dispositivos) && c.limites.dispositivos > 0 ? c.limites.dispositivos : MAX_TOKENS_POR_PERSONA]));

  const porPersona = new Map();
  for (const p of pagos) {
    if (!porPersona.has(p.uidUsuario)) porPersona.set(p.uidUsuario, []);
    if (porPersona.get(p.uidUsuario).length < MAX_PAGOS_POR_PERSONA) porPersona.get(p.uidUsuario).push(p);
  }
  if (porPersona.size) {
    const datosPerfil = await perfiles(env, accessToken, pedir, [...porPersona.keys()]);
    for (const [uid, lista] of porPersona) {
      const hoy = hoyEnZona(datosPerfil[uid]?.zona || ZONA_POR_DEFECTO, ahora);
      const avisos = lista.map((p) => ({ pago: p, tipo: avisoPendiente(p, hoy) })).filter((a) => a.tipo);
      if (!avisos.length) continue;
      const datos = { tipo: "recordatorio", cantidad: String(avisos.length), url: "/recurrentes" };
      if (datosPerfil[uid]?.detalleEnAviso) datos.detalle = armarDetalle(avisos.map((a) => a.pago));
      resumen.personas++;
      resumen.avisos += avisos.length;
      destinos.push({ uid, datos, marcas: avisos.map(({ pago, tipo }) => ({ ruta: pago.ruta, clave: claveAviso(pago, tipo) })) });
    }
  }

  for (const a of avisosAClientes(clientes, ahora.getTime())) {
    resumen.avisosPlan++;
    destinos.push({ uid: a.uid, datos: a.datos, marcas: [{ ruta: a.ruta, clave: a.clave, campo: a.campo }] });
  }
  for (const a of resumenParaAdmins(admins, clientes, ahora)) {
    resumen.resumenesAdmin++;
    destinos.push({ uid: a.uid, datos: a.datos, marcas: [{ ruta: a.ruta, clave: a.clave, campo: a.campo }] });
  }
  if (!destinos.length) return resumen;

  const tokens = await todosLosTokens(env, accessToken, pedir);
  const confirmados = [];
  const aBorrar = new Set();
  let envios = 0;
  for (const { uid, datos, marcas } of destinos) {
    //Dispositivos vigentes: los más recientes, hasta el cupo de su plan (por defecto 10)
    const tope = Math.min(MAX_TOKENS_POR_PERSONA, limitePorPersona.get(uid) ?? MAX_TOKENS_POR_PERSONA);
    const vigentes = [];
    for (const t of tokens.filter((x) => x.uid === uid).sort((a, b) => (a.actualizado < b.actualizado ? 1 : -1))) {
      if (vigentes.length >= tope || diasDesde(t.actualizado, ahora) > DIAS_MAX_TOKEN) { aBorrar.add(t.ruta); continue; }
      vigentes.push(t);
    }
    let llego = false;
    for (const t of vigentes) {
      if (envios >= MAX_ENVIOS) { resumen.omitidos++; continue; }
      envios++;
      const r = await enviarPush(env, accessToken, pedir, t.token, datos);
      if (r.ok) { llego = true; resumen.enviados++; } else if (r.invalido) aBorrar.add(t.ruta);
    }
    //Solo se marca como avisado si al menos un dispositivo lo recibió: si no, mañana no se «gasta» el aviso
    if (llego) confirmados.push(...marcas);
  }
  resumen.tokensBorrados = aBorrar.size;
  await confirmar(env, accessToken, pedir, { avisos: confirmados, tokensABorrar: [...aBorrar] });
  return resumen;
};
