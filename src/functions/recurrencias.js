//Cálculo de fechas de los pagos recurrentes. Módulo puro y sin dependencias: lo usan la app (React) y el
//Worker de Cloudflare que envía los recordatorios, así que no debe importar nada de React ni de Firebase.
//Las fechas son texto «AAAA-MM-DD» (fecha local, sin hora) para que no dependan de la zona horaria.

export const FRECUENCIAS = ["semanal", "quincenal", "mensual", "anual"];
export const DIAS_ANTES_AVISO = 3;
export const ZONA_POR_DEFECTO = "America/Bogota";

const MS_DIA = 86400000;
const aNumeros = (texto) => texto.split("-").map(Number);
const dosDigitos = (n) => String(n).padStart(2, "0");

export const fechaTexto = (anio, mes, dia) => `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
export const diasDelMes = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();
const aUTC = (texto) => { const [a, m, d] = aNumeros(texto); return Date.UTC(a, m - 1, d); };
const deUTC = (ms) => { const f = new Date(ms); return fechaTexto(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate()); };

export const sumarDias = (texto, dias) => deUTC(aUTC(texto) + dias * MS_DIA);
//Días enteros desde `desde` hasta `hasta` (negativo si `hasta` ya pasó)
export const diasEntre = (desde, hasta) => Math.round((aUTC(hasta) - aUTC(desde)) / MS_DIA);
//Día de la semana ISO: 1 = lunes … 7 = domingo
export const diaSemanaISO = (texto) => new Date(aUTC(texto)).getUTCDay() || 7;

//Si el día no existe en ese mes (31 en febrero), el pago cae el último día del mes
const ajustarDia = (anio, mes, dia) => Math.min(dia, diasDelMes(anio, mes));

//Fechas de vencimiento que tiene un mes (semanal se calcula aparte)
const vencimientosDelMes = (rec, anio, mes) => {
  const ultimo = diasDelMes(anio, mes);
  if (rec.frecuencia === "quincenal") return [fechaTexto(anio, mes, 15), fechaTexto(anio, mes, ultimo)];
  if (rec.frecuencia === "mensual") return [fechaTexto(anio, mes, ajustarDia(anio, mes, rec.dia))];
  if (rec.frecuencia === "anual" && mes === rec.mes) return [fechaTexto(anio, mes, ajustarDia(anio, mes, rec.dia))];
  return [];
};

//Primer vencimiento posterior a `desde` (no incluye `desde`)
export const siguienteFecha = (rec, desde) => {
  if (rec.frecuencia === "semanal") {
    const falta = (rec.dia - diaSemanaISO(desde) + 7) % 7 || 7;
    return sumarDias(desde, falta);
  }
  let [anio, mes] = aNumeros(desde);
  for (let i = 0; i < 26; i++) {
    const siguiente = vencimientosDelMes(rec, anio, mes).find((f) => f > desde);
    if (siguiente) return siguiente;
    mes += 1;
    if (mes > 12) { mes = 1; anio += 1; }
  }
  return null;
};

//Primer vencimiento desde hoy (incluido), para el alta de un pago nuevo
export const primeraFecha = (rec, hoy) => siguienteFecha(rec, sumarDias(hoy, -1));

//Fecha de hoy en la zona horaria de la persona (zona inválida → Bogotá)
export const hoyEnZona = (zona, ahora = new Date()) => {
  const formato = (z) => new Intl.DateTimeFormat("en-CA", { timeZone: z, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
  try { return formato(zona); } catch { return formato(ZONA_POR_DEFECTO); }
};

//Estado para la pantalla: vencido | hoy | pronto (próximos 7 días) | al-dia
export const estadoPago = (rec, hoy) => {
  const dias = diasEntre(hoy, rec.proximaFecha);
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoy";
  return dias <= 7 ? "pronto" : "al-dia";
};

//Aviso que toca hoy: 3 días antes y el mismo día. No hay aviso de vencido ni se recupera un aviso perdido.
export const tipoAviso = (rec, hoy) => {
  if (!rec.activo) return null;
  const dias = diasEntre(hoy, rec.proximaFecha);
  if (dias === DIAS_ANTES_AVISO) return "antes";
  if (dias === 0) return "hoy";
  return null;
};

export const claveAviso = (rec, tipo) => `${rec.proximaFecha}:${tipo}`;

//Aviso pendiente de enviar hoy (null si no toca o ya se envió)
export const avisoPendiente = (rec, hoy) => {
  const tipo = tipoAviso(rec, hoy);
  return tipo && rec.ultimoAviso !== claveAviso(rec, tipo) ? tipo : null;
};

//Texto del vencimiento para la lista («vence hoy», «en 3 días», «hace 2 días»)
export const etiquetaVencimiento = (rec, hoy) => {
  const dias = diasEntre(hoy, rec.proximaFecha);
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias > 1) return `en ${dias} días`;
  return dias === -1 ? "venció ayer" : `venció hace ${-dias} días`;
};
