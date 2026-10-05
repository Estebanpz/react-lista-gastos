//Cálculos puros sobre listas de gastos (sin Firebase ni React: fáciles de probar).
//Un gasto es {id, descripcion, cantidad, categoria, fecha (segundos Unix), uidUsuario}.
import { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths, getUnixTime, fromUnixTime, getDaysInMonth, isSameMonth } from "date-fns";

export const rangoMes = (fecha) => [getUnixTime(startOfMonth(fecha)), getUnixTime(endOfMonth(fecha))];
//Semana de lunes a domingo
export const rangoSemana = (fecha) => [getUnixTime(startOfWeek(fecha, { weekStartsOn: 1 })), getUnixTime(endOfWeek(fecha, { weekStartsOn: 1 }))];
//Tres meses calendario que terminan en el mes de `fecha`
export const rangoTrimestre = (fecha) => [getUnixTime(startOfMonth(subMonths(fecha, 2))), getUnixTime(endOfMonth(fecha))];
//Días elegidos a mano (ambos incluidos)
export const rangoDias = (desde, hasta) => [getUnixTime(startOfDay(desde)), getUnixTime(endOfDay(hasta))];
export const rangoAnio = (fecha) => [getUnixTime(startOfYear(fecha)), getUnixTime(endOfYear(fecha))];

export const totalGastos = (gastos) => gastos.reduce((acc, g) => acc + Number(g.cantidad), 0);

//Total y porcentaje por categoría, de mayor a menor. Solo incluye categorías con gastos.
export const porCategoria = (gastos) => {
  const mapa = new Map();
  gastos.forEach((g) => {
    const actual = mapa.get(g.categoria) || { id: g.categoria, total: 0, cuenta: 0 };
    actual.total += Number(g.cantidad);
    actual.cuenta += 1;
    mapa.set(g.categoria, actual);
  });
  const suma = totalGastos(gastos);
  return [...mapa.values()]
    .map((c) => ({ ...c, porcentaje: suma ? (c.total / suma) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
};

//Gasto acumulado día a día del mes de `fecha`. Si es el mes en curso llega hasta `hoy`; si no, hasta fin de mes.
export const acumuladoPorDia = (gastos, fecha, hoy = new Date()) => {
  const dias = isSameMonth(fecha, hoy) ? hoy.getDate() : getDaysInMonth(fecha);
  const porDia = new Array(dias).fill(0);
  gastos.forEach((g) => {
    const d = fromUnixTime(g.fecha).getDate();
    if (d >= 1 && d <= dias) porDia[d - 1] += Number(g.cantidad);
  });
  let acumulado = 0;
  return porDia.map((total, i) => {
    acumulado += total;
    return { dia: i + 1, total, acumulado };
  });
};

const claveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

//Agrupa por día (más reciente primero) con el subtotal de cada día
export const agruparPorDia = (gastos) => {
  const mapa = new Map();
  gastos.forEach((g) => {
    const fecha = fromUnixTime(g.fecha);
    const clave = claveDia(fecha);
    if (!mapa.has(clave)) mapa.set(clave, { clave, fecha, gastos: [], subtotal: 0 });
    const grupo = mapa.get(clave);
    grupo.gastos.push(g);
    grupo.subtotal += Number(g.cantidad);
  });
  return [...mapa.values()].sort((a, b) => b.fecha - a.fecha);
};

//Agrupa por categoría (la de más gasto primero)
export const agruparPorCategoria = (gastos) => {
  const resumen = porCategoria(gastos);
  return resumen.map((c) => ({ ...c, gastos: gastos.filter((g) => g.categoria === c.id) }));
};

const sinTildes = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

//Filtra por texto (en la descripción, sin distinguir mayúsculas ni tildes) y por categorías elegidas
export const filtrarGastos = (gastos, { texto = "", categorias = [] } = {}) => {
  const buscado = sinTildes(texto.trim());
  return gastos.filter((g) => {
    if (categorias.length && !categorias.includes(g.categoria)) return false;
    if (buscado && !sinTildes(g.descripcion).includes(buscado)) return false;
    return true;
  });
};

export const ordenarGastos = (gastos, orden = "reciente") => {
  const copia = [...gastos];
  if (orden === "mayor") return copia.sort((a, b) => b.cantidad - a.cantidad);
  if (orden === "menor") return copia.sort((a, b) => a.cantidad - b.cantidad);
  if (orden === "antiguo") return copia.sort((a, b) => a.fecha - b.fecha);
  return copia.sort((a, b) => b.fecha - a.fecha);
};

const larga = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });
const conDia = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });
const mesAnio = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" });
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export const etiquetaDia = (fecha, hoy = new Date()) => {
  const mismoDia = (a, b) => claveDia(a) === claveDia(b);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(fecha, hoy)) return `Hoy, ${larga.format(fecha)}`;
  if (mismoDia(fecha, ayer)) return `Ayer, ${larga.format(fecha)}`;
  return cap(conDia.format(fecha));
};

export const etiquetaMes = (fecha) => cap(mesAnio.format(fecha));
export const etiquetaDiaCorta = (fecha) => larga.format(fecha);
export const claveFecha = claveDia;

const corta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
const cortaAnio = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });
//«5 – 11 oct», «28 sep – 4 oct», «3 sep – 12 oct 2026» (con año si no es el actual)
export const etiquetaRango = (desde, hasta, hoy = new Date()) => {
  const mismoAnio = desde.getFullYear() === hoy.getFullYear() && hasta.getFullYear() === hoy.getFullYear();
  const f = mismoAnio ? corta : cortaAnio;
  if (desde.getMonth() === hasta.getMonth() && desde.getFullYear() === hasta.getFullYear() && mismoAnio) {
    return desde.getDate() === hasta.getDate() ? f.format(desde) : `${desde.getDate()} – ${f.format(hasta)}`;
  }
  return `${f.format(desde)} – ${f.format(hasta)}`;
};
