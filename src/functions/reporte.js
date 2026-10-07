//Reporte de gastos y pagos recurrentes (Excel y PDF). Módulo puro y sin dependencias de React ni de Firebase:
//recibe los datos ya leídos y devuelve el reporte listo para dibujar. Las fechas son texto «AAAA-MM-DD» en hora de Colombia.
import { describirFrecuencia, estadoPago, hoyEnZona, sumarDias, ZONA_POR_DEFECTO } from "./recurrencias";

export const PERIODOS = [
  { id: "mes", etiqueta: "Este mes" },
  { id: "12meses", etiqueta: "Últimos 12 meses" },
  { id: "todo", etiqueta: "Todo el historial" },
];

const fechaDeGasto = (segundos) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_POR_DEFECTO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(segundos * 1000));

//Rango [desde, hasta] (AAAA-MM-DD; desde puede ser null = sin límite) del periodo elegido, contando desde `hoy`
export const rangoDelPeriodo = (periodo, hoy) => {
  const [anio, mes] = hoy.split("-").map(Number);
  if (periodo === "mes") return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
  if (periodo === "12meses") {
    const total = anio * 12 + (mes - 1) - 11;
    const a = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return { desde: `${a}-${String(m).padStart(2, "0")}-01`, hasta: hoy };
  }
  return { desde: null, hasta: hoy };
};

//Mismo nombre aunque cambien mayúsculas, tildes o espacios sobrantes: «Netflix», « netflix  » y «NETFLIX» son uno
const claveNombre = (nombre) => String(nombre).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const limpiarNombre = (nombre) => String(nombre).replace(/\s+/g, " ").trim();

//Los gastos creados al registrar un pago recurrente tienen el id «rec_{idDelPago}_{AAAA-MM-DD}»
const PAGO_DE_GASTO = /^rec_(.+)_(\d{4}-\d{2}-\d{2})$/;
export const idPagoDeGasto = (idGasto) => {
  const m = PAGO_DE_GASTO.exec(idGasto || "");
  return m ? m[1] : null;
};

const REDONDEO = (n) => Math.round(n);
//Costo mensual aproximado de un pago según su frecuencia
const aMensual = (rec) => ({ semanal: (rec.cantidad * 52) / 12, quincenal: rec.cantidad * 2, mensual: rec.cantidad, anual: rec.cantidad / 12 }[rec.frecuencia] || 0);

const ESTADOS = { vencido: "Vencido", hoy: "Vence hoy", pronto: "Vence pronto", "al-dia": "Al día" };

//gastos: [{id, descripcion, cantidad, categoria, fecha (segundos)}]; recurrentes: [{id, descripcion, cantidad, categoria, frecuencia, dia, mes, proximaFecha, activo}]
//porId(idCategoria) → {texto}
export const armarReporte = ({ gastos, recurrentes, porId, periodo = "todo", ahora = new Date(), correo = "" }) => {
  const hoy = hoyEnZona(ZONA_POR_DEFECTO, ahora);
  const { desde, hasta } = rangoDelPeriodo(periodo, hoy);
  const nombreCategoria = (id) => (porId(id) || {}).texto || "Sin categoría";

  const todos = gastos
    .map((g) => ({
      id: g.id || "",
      fecha: fechaDeGasto(g.fecha),
      nombre: limpiarNombre(g.descripcion),
      categoria: nombreCategoria(g.categoria),
      monto: Number(g.cantidad),
      pagoId: idPagoDeGasto(g.id),
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.nombre.localeCompare(b.nombre, "es")));
  const detalle = todos
    .filter((g) => (!desde || g.fecha >= desde) && g.fecha <= hasta)
    .map((g) => ({ fecha: g.fecha, nombre: g.nombre, categoria: g.categoria, origen: g.pagoId ? "Gasto fijo (pago)" : "Gasto variable", monto: g.monto, pagoId: g.pagoId }));

  const total = detalle.reduce((s, g) => s + g.monto, 0);

  //Por categoría
  const cats = new Map();
  for (const g of detalle) {
    const c = cats.get(g.categoria) || { categoria: g.categoria, cantidad: 0, total: 0 };
    c.cantidad++;
    c.total += g.monto;
    cats.set(g.categoria, c);
  }
  const porCategoria = [...cats.values()].sort((a, b) => b.total - a.total).map((c) => ({ ...c, porcentaje: total ? Math.round((c.total / total) * 1000) / 10 : 0 }));

  //Por nombre (el detalle viene de más reciente a más antiguo)
  const nombres = new Map();
  for (const g of detalle) {
    const k = claveNombre(g.nombre);
    const n = nombres.get(k) || { nombre: g.nombre, veces: 0, total: 0, primera: g.fecha, ultima: g.fecha, categorias: new Map(), esPago: false };
    n.veces++;
    n.total += g.monto;
    if (g.fecha < n.primera) n.primera = g.fecha;
    if (g.fecha > n.ultima) n.ultima = g.fecha;
    n.categorias.set(g.categoria, (n.categorias.get(g.categoria) || 0) + 1);
    if (g.pagoId) n.esPago = true;
    nombres.set(k, n);
  }
  const porNombre = [...nombres.values()]
    .map((n) => ({
      nombre: n.nombre,
      categoria: [...n.categorias.entries()].sort((a, b) => b[1] - a[1])[0][0],
      veces: n.veces,
      total: n.total,
      promedio: REDONDEO(n.total / n.veces),
      primera: n.primera,
      ultima: n.ultima,
      esPago: n.esPago,
    }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));

  //Pagos recurrentes: estado actual + lo pagado en el periodo + última fecha pagada (en todo el historial)
  const enPeriodo = new Map();
  for (const g of detalle) if (g.pagoId) enPeriodo.set(g.pagoId, [...(enPeriodo.get(g.pagoId) || []), g]);
  const ultimaPagada = new Map();
  for (const g of todos) if (g.pagoId && !ultimaPagada.has(g.pagoId)) ultimaPagada.set(g.pagoId, g.fecha); //`todos` va de más reciente a más antiguo
  const pagos = recurrentes
    .map((r) => {
      const mios = enPeriodo.get(r.id) || [];
      return {
        nombre: limpiarNombre(r.descripcion),
        categoria: nombreCategoria(r.categoria),
        frecuencia: describirFrecuencia(r),
        proximoVencimiento: r.proximaFecha,
        monto: Number(r.cantidad),
        estado: r.activo ? ESTADOS[estadoPago(r, hoy)] : "Pausado",
        activo: Boolean(r.activo),
        vecesPagado: mios.length,
        totalPagado: mios.reduce((s, g) => s + g.monto, 0),
        ultimaFechaPagada: ultimaPagada.get(r.id) || null,
      };
    })
    .sort((a, b) => (a.activo === b.activo ? (a.proximoVencimiento < b.proximoVencimiento ? -1 : 1) : a.activo ? -1 : 1));

  const activos = recurrentes.filter((r) => r.activo);
  return {
    meta: {
      correo,
      periodo,
      etiquetaPeriodo: (PERIODOS.find((p) => p.id === periodo) || PERIODOS[2]).etiqueta,
      desde,
      hasta,
      generado: hoy,
    },
    resumen: {
      total,
      cantidad: detalle.length,
      totalPagosRecurrentes: detalle.filter((g) => g.pagoId).reduce((s, g) => s + g.monto, 0),
      pagosActivos: activos.length,
      pagosMensualEstimado: REDONDEO(activos.reduce((s, r) => s + aMensual(r), 0)),
    },
    porCategoria,
    porNombre,
    pagos,
    detalle: detalle.map(({ pagoId, ...resto }) => resto),
  };
};

//Nombre de archivo sin caracteres raros: finanzas-reporte-AAAA-MM-DD.xlsx
export const nombreArchivoReporte = (reporte, extension) => `finanzas-reporte-${reporte.meta.generado}.${extension}`;

//Días entre dos fechas AAAA-MM-DD (para pruebas y etiquetas)
export const diasDesde = (fecha, hoy) => Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86400000);
export { sumarDias };
