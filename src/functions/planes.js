//Catálogo de planes y cálculo del estado de un cliente. Módulo puro y sin dependencias: lo usan la app, el
//panel de super admin y, más adelante, el Worker que avisa de los vencimientos.
//Los límites de cada plan se COPIAN a `clientes/{uid}.limites` al asignarlo: las reglas de Firestore leen
//ese documento, no este catálogo (por eso un cliente puede tener límites distintos del plan, p. ej. un cupo extra).

export const PLANES = {
  prueba: { id: "prueba", nombre: "Prueba", precio: 0, dias: 30, limites: { gastosMes: 2, pagosActivos: 2, categorias: 1, dispositivos: 1 } },
  basico: { id: "basico", nombre: "Básico", precio: 60000, dias: 30, limites: { gastosMes: 30, pagosActivos: 5, categorias: 3, dispositivos: 2 } },
  plus: { id: "plus", nombre: "Plus", precio: 80000, dias: 30, limites: { gastosMes: 100, pagosActivos: 20, categorias: 8, dispositivos: 3 } },
  negocio: { id: "negocio", nombre: "Negocio", precio: 140000, dias: 30, limites: { gastosMes: 200, pagosActivos: 50, categorias: 20, dispositivos: 5 } },
};
export const IDS_PLAN = Object.keys(PLANES);
export const ESTADOS_GUARDADOS = ["prueba", "activo", "suspendido"];
export const CLAVES_LIMITE = ["gastosMes", "pagosActivos", "categorias", "dispositivos"];

export const ETIQUETAS_LIMITE = {
  gastosMes: "Gastos registrados",
  pagosActivos: "Pagos recurrentes",
  categorias: "Categorías propias",
  dispositivos: "Dispositivos con avisos",
};

const MS_DIA = 86400000;
//Colombia es UTC-5 todo el año (sin horario de verano). Los días y los meses del plan se cuentan en esa hora, no en
//la del dispositivo ni en UTC: lección de ZF Manager, donde un servidor en UTC corría los cortes 5 horas.
const DESFASE_COLOMBIA = 5 * 3600000;
export const DIAS_AVISO_VENCIMIENTO = 7;

//Fecha de vencimiento como número (ms) venga de un Timestamp de Firestore, de una Date o de un número
const aMs = (valor) => (valor && typeof valor.toMillis === "function" ? valor.toMillis() : valor instanceof Date ? valor.getTime() : Number(valor));

//Último instante (23:59:59.999, hora de Colombia) del día en que cae `ms`: el plan vence al terminar ese día
export const finDeDiaColombia = (ms) => (Math.floor((ms - DESFASE_COLOMBIA) / MS_DIA) + 1) * MS_DIA - 1 + DESFASE_COLOMBIA;

//Días de calendario (hora de Colombia) entre hoy y el día del vencimiento: 0 = hoy, 1 = mañana, negativo = ya pasó
export const diasParaVencer = (vence, ahora = Date.now()) =>
  Math.floor((aMs(vence) - DESFASE_COLOMBIA) / MS_DIA) - Math.floor((aMs(ahora) - DESFASE_COLOMBIA) / MS_DIA);

//Estado que ve el super admin y el cliente:
// prueba | activo | por-vencer | vencido | suspendido
export const estadoCliente = (cliente, ahora = Date.now()) => {
  if (!cliente) return "sin-plan";
  if (cliente.estado === "suspendido") return "suspendido";
  if (aMs(cliente.vence) < aMs(ahora)) return "vencido";
  if (diasParaVencer(cliente.vence, ahora) <= DIAS_AVISO_VENCIMIENTO) return "por-vencer";
  return cliente.estado === "prueba" ? "prueba" : "activo";
};

//¿Puede el cliente registrar datos nuevos? (lo mismo que exigen las reglas de Firestore)
export const puedeEscribir = (cliente, ahora = Date.now()) =>
  Boolean(cliente) && cliente.estado !== "suspendido" && aMs(cliente.vence) >= aMs(ahora);

//Texto corto del estado: «Activo», «Vence en 3 días», «Vencido hace 5 días», «Suspendido»…
export const textoEstado = (cliente, ahora = Date.now()) => {
  const estado = estadoCliente(cliente, ahora);
  if (estado === "suspendido") return "Suspendido";
  if (estado === "sin-plan") return "Sin plan";
  const dias = diasParaVencer(cliente.vence, ahora);
  if (estado === "vencido") return dias === 0 ? "Vencido hoy" : dias === -1 ? "Vencido ayer" : `Vencido hace ${-dias} días`;
  if (estado === "por-vencer") return dias === 0 ? "Vence hoy" : dias === 1 ? "Vence mañana" : `Vence en ${dias} días`;
  return estado === "prueba" ? "En prueba" : "Activo";
};

//Límites de un plan, con cupos a medida que el super admin haya fijado para ese cliente
export const limitesDePlan = (idPlan, extras = {}) => {
  const base = PLANES[idPlan] ? PLANES[idPlan].limites : PLANES.prueba.limites;
  const resultado = { ...base };
  CLAVES_LIMITE.forEach((clave) => {
    //Un 0 o un valor inválido significa «sin cupo a medida» (error que ya hubo en ZF Manager con un override en 0)
    if (Number.isInteger(extras[clave]) && extras[clave] > 0) resultado[clave] = extras[clave];
  });
  return resultado;
};

//Nuevo vencimiento al registrar un pago: se suma desde el vencimiento actual si todavía no pasó (para no
//regalar ni quitar días) o desde hoy si ya venció. Nunca acorta un plazo vigente. Siempre termina al cierre de un día.
export const nuevoVencimiento = (venceActual, dias, ahora = Date.now()) => {
  const base = Math.max(venceActual ? aMs(venceActual) : 0, aMs(ahora));
  return finDeDiaColombia(base + dias * MS_DIA);
};

//Nivel de uso para colorear las barras: ok (<80 %), aviso (80–99 %), limite (100 % o más)
export const nivelUso = (usado, limite) => {
  if (!limite) return "ok";
  const porcentaje = (usado / limite) * 100;
  return porcentaje >= 100 ? "limite" : porcentaje >= 80 ? "aviso" : "ok";
};
export const porcentajeUso = (usado, limite) => (limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0);

//Ranuras: los pagos recurrentes y las categorías propias tienen id fijo `{uid}_{n}` con n entre 1 y el tope del plan.
//Como un id es único, Firestore nunca guarda más de `tope` documentos: las reglas lo hacen cumplir sin contadores
//(que se podrían falsear). Se usa la primera ranura libre; borrar un elemento libera su ranura.
export const idRanura = (uid, n) => `${uid}_${n}`;
export const ranuraLibre = (uid, idsOcupados, tope) => {
  const ocupados = new Set(idsOcupados);
  for (let n = 1; n <= tope; n++) if (!ocupados.has(idRanura(uid, n))) return idRanura(uid, n);
  return null;
};

//Clave del documento de uso mensual. El mes es el de Colombia (UTC-5); las reglas de Firestore hacen la misma cuenta.
export const claveUso = (uid, fecha = new Date()) => {
  const local = new Date(fecha.getTime() - DESFASE_COLOMBIA);
  return `${uid}_${local.getUTCFullYear()}_${local.getUTCMonth() + 1}`;
};
