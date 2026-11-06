//Ciclo de avisos. El cron corre a las 8:00 y a las 8:30, 11:30, 14:30 y 17:30 (hora de Colombia; ver wrangler.jsonc):
//  1) pagos recurrentes: push 3 días antes (una vez) y el día del pago en cada turno desde las 8:30 hasta que se registre
//     (UN aviso por persona y turno); SMS del día del pago, programado a las 8:00 para las 8:30 (ver sms.js);
//  2) planes de los clientes: al cliente cuando le faltan 7, 3 o 0 días y al vencer, y un resumen semanal al super admin.
//Comparte el cálculo de fechas con la app (src/functions/recurrencias.js, planes.js y sms.js).
import { avisoPendiente, claveAviso, hoyEnZona, sumarDias, turnoDelDia, ZONA_POR_DEFECTO } from "../../src/functions/recurrencias.js";
import { obtenerAccessToken } from "./google.js";
import { pagosEnVentana, perfiles, todosLosTokens, todosLosClientes, superAdmins, confirmar } from "./firestore.js";
import { enviarPush } from "./fcm.js";
import { avisosAClientes, resumenParaAdmins } from "./planes.js";
import { smsPendiente, enviarSms, hayCredencialesSms } from "./sms.js";

//Límites del plan Free de Workers: 50 subrequests por ejecución (7 fijas + 1 por push + 1 por SMS + 1 de confirmación)
export const MAX_ENVIOS = 30;
export const MAX_SMS = 8;
export const MAX_TOKENS_POR_PERSONA = 10;
export const MAX_PAGOS_POR_PERSONA = 100;
const DIAS_MAX_TOKEN = 270; //FCM da por inactivo un token sin renovar en ~270 días
const MAX_DETALLE = 120;

const diasDesde = (iso, ahora) => (ahora.getTime() - new Date(iso).getTime()) / 86400000;

//Texto opcional con las descripciones (nunca montos); solo si la persona lo activó
const armarDetalle = (pagos) => pagos.map((p) => p.descripcion).join(", ").slice(0, MAX_DETALLE);

export const ejecutar = async (env, { fetch: pedir = fetch, ahora = new Date() } = {}) => {
  const resumen = { personas: 0, avisos: 0, enviados: 0, tokensBorrados: 0, omitidos: 0, avisosPlan: 0, resumenesAdmin: 0, sms: 0, smsFallidos: 0, smsOmitidos: 0 };
  const cuenta = JSON.parse(env.GOOGLE_SA_JSON);
  const accessToken = await obtenerAccessToken(cuenta, { fetch: pedir, ahoraSeg: Math.floor(ahora.getTime() / 1000) });
  const turno = turnoDelDia(ahora);

  //Ventana amplia en UTC (cubre cualquier zona horaria); el filtro exacto se hace con la fecha local de cada persona
  const hoyUTC = hoyEnZona("UTC", ahora);
  const pagos = await pagosEnVentana(env, accessToken, pedir, sumarDias(hoyUTC, -1), sumarDias(hoyUTC, 4));
  const clientes = await todosLosClientes(env, accessToken, pedir);
  const admins = await superAdmins(env, accessToken, pedir);
  const clientePorUid = new Map(clientes.map((c) => [c.id, c]));

  //Destinatarios: cada uno con su mensaje y las marcas que se escriben si llegó a algún dispositivo
  const destinos = [];
  const marcasSms = [];
  let smsUsados = 0;
  const limitePorPersona = new Map(clientes.map((c) => [c.id, Number.isInteger(c.limites?.dispositivos) && c.limites.dispositivos > 0 ? c.limites.dispositivos : MAX_TOKENS_POR_PERSONA]));

  const porPersona = new Map();
  for (const p of pagos) {
    if (!porPersona.has(p.uidUsuario)) porPersona.set(p.uidUsuario, []);
    if (porPersona.get(p.uidUsuario).length < MAX_PAGOS_POR_PERSONA) porPersona.get(p.uidUsuario).push(p);
  }
  if (porPersona.size) {
    const datosPerfil = await perfiles(env, accessToken, pedir, [...porPersona.keys()]);
    for (const [uid, lista] of porPersona) {
      const perfil = datosPerfil[uid];
      const hoy = hoyEnZona(perfil?.zona || ZONA_POR_DEFECTO, ahora);

      //SMS del día del pago: se decide con TODOS los pagos activos de hoy (avisados por push o no)
      const sms = smsPendiente({ perfil, cliente: clientePorUid.get(uid), pagosHoy: lista.filter((p) => p.activo && p.proximaFecha === hoy), hoy, ahora, turno });
      if (sms) {
        if (!hayCredencialesSms(env) || smsUsados >= MAX_SMS) resumen.smsOmitidos++;
        else {
          smsUsados++;
          try {
            await enviarSms(env, pedir, sms.envio);
            resumen.sms++;
            marcasSms.push(sms.marca);
          } catch (e) {
            resumen.smsFallidos++;
            console.error(JSON.stringify({ evento: "sms-error", codigo: e.codigoLabsMobile || String(e.estadoHttp || "red") }));
          }
        }
      }

      const avisos = lista.map((p) => ({ pago: p, tipo: avisoPendiente(p, hoy, turno) })).filter((a) => a.tipo);
      if (!avisos.length) continue;
      const datos = { tipo: "recordatorio", cantidad: String(avisos.length), url: "/recurrentes" };
      if (avisos.some((a) => a.tipo === "hoy")) datos.hoy = "1";
      if (perfil?.detalleEnAviso) datos.detalle = armarDetalle(avisos.map((a) => a.pago));
      resumen.personas++;
      resumen.avisos += avisos.length;
      destinos.push({ uid, datos, marcas: avisos.map(({ pago, tipo }) => ({ ruta: pago.ruta, clave: claveAviso(pago, tipo, turno) })) });
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
  if (!destinos.length) {
    if (marcasSms.length) await confirmar(env, accessToken, pedir, { avisos: marcasSms, tokensABorrar: [] });
    return resumen;
  }

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
    //Solo se marca como avisado si al menos un dispositivo lo recibió: si no, el siguiente turno no «gasta» el aviso
    if (llego) confirmados.push(...marcas);
  }
  resumen.tokensBorrados = aBorrar.size;
  await confirmar(env, accessToken, pedir, { avisos: [...confirmados, ...marcasSms], tokensABorrar: [...aBorrar] });
  return resumen;
};
