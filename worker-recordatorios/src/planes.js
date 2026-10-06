//Avisos de los planes de los clientes (la mensualidad de Finanzas). Módulo puro: decide a quién avisar y qué marcar.
//Lección de ZF Manager: un cron que no recuerda qué avisó pierde el aviso si un día falla. Aquí cada cliente guarda en
//`ultimoAvisoPlan` la clave «vencimiento:etapa» del último aviso enviado, y se avisa cuando la etapa actual es otra
//(comparación «ya llegó a esa etapa», no «hoy es exactamente el día 3»), así el reintento del día siguiente sale solo.
import { diasParaVencer } from "../../src/functions/planes.js";
import { diaSemanaISO, hoyEnZona, sumarDias, ZONA_POR_DEFECTO } from "../../src/functions/recurrencias.js";

const DIAS_ATRAS_MAX = 3; //no se avisa de planes vencidos hace más de 3 días (evita avisos viejos al activar el sistema)

const aMs = (iso) => Date.parse(iso);

//Etapa de aviso de un cliente según los días de calendario (hora de Colombia) que faltan: 7, 3, 0 o -1 (venció)
export const etapaDeAviso = (cliente, ahoraMs) => {
  if (!cliente || cliente.estado === "suspendido" || !cliente.vence) return null;
  const dias = diasParaVencer(aMs(cliente.vence), ahoraMs);
  if (dias < -DIAS_ATRAS_MAX) return null;
  if (dias < 0) return { etapa: -1, dias };
  if (dias === 0) return { etapa: 0, dias };
  if (dias <= 3) return { etapa: 3, dias };
  if (dias <= 7) return { etapa: 7, dias };
  return null;
};

export const claveAvisoPlan = (cliente, etapa) => `${cliente.vence}:${etapa}`;

//Avisos de plan pendientes para los clientes (a cada uno, en sus dispositivos)
export const avisosAClientes = (clientes, ahoraMs) =>
  clientes
    .map((c) => ({ c, e: etapaDeAviso(c, ahoraMs) }))
    .filter(({ c, e }) => e && c.ultimoAvisoPlan !== claveAvisoPlan(c, e.etapa))
    .map(({ c, e }) => ({ uid: c.id, ruta: c.ruta, clave: claveAvisoPlan(c, e.etapa), campo: "ultimoAvisoPlan", datos: { tipo: "plan", dias: String(e.dias), url: "/plan" } }));

//Lunes de la semana (hora de Colombia) a la que pertenece `ahora`
export const lunesDeLaSemana = (ahora) => {
  const hoy = hoyEnZona(ZONA_POR_DEFECTO, ahora);
  return sumarDias(hoy, -(diaSemanaISO(hoy) - 1));
};

//Resumen semanal para el super admin (una vez por semana): planes por vencer en 7 días y vencidos sin renovar.
//Se envía el primer día de la semana en que el cron corre y hay algo que contar; `ultimoResumenPlanes` guarda el lunes.
export const resumenParaAdmins = (admins, clientes, ahora) => {
  const ahoraMs = ahora.getTime();
  const lunes = lunesDeLaSemana(ahora);
  let porVencer = 0;
  let vencidos = 0;
  for (const c of clientes) {
    if (c.estado === "suspendido" || !c.vence) continue;
    const dias = diasParaVencer(aMs(c.vence), ahoraMs);
    if (dias < 0) vencidos++;
    else if (dias <= 7) porVencer++;
  }
  if (!porVencer && !vencidos) return [];
  return admins
    .filter((a) => a.ultimoResumenPlanes !== lunes)
    .map((a) => ({ uid: a.id, ruta: a.ruta, clave: lunes, campo: "ultimoResumenPlanes", datos: { tipo: "resumen-planes", porVencer: String(porVencer), vencidos: String(vencidos), url: "/admin" } }));
};
