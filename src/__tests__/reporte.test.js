import { armarReporte, rangoDelPeriodo, idPagoDeGasto, nombreArchivoReporte } from "../functions/reporte";

//Mediodía en Bogotá del día indicado, en segundos Unix
const seg = (iso) => Math.floor(new Date(`${iso}T12:00:00-05:00`).getTime() / 1000);
const AHORA = new Date("2026-10-15T15:00:00Z"); //10:00 del 15 de octubre de 2026 en Bogotá
const porId = (id) => ({ comida: { texto: "Comida" }, recibos: { texto: "Recibos" }, creditos: { texto: "Créditos" } }[id]);

const gastos = [
  { id: "g1", descripcion: "Almuerzo del equipo", cantidad: 35000, categoria: "comida", fecha: seg("2026-10-03") },
  { id: "g2", descripcion: "Cuota carro; \"Bancolombia\", octubre", cantidad: 850000, categoria: "creditos", fecha: seg("2026-10-05") },
  { id: "rec_u1_2_2026-10-05", descripcion: "Netflix", cantidad: 30000, categoria: "recibos", fecha: seg("2026-10-05") },
  { id: "rec_u1_2_2026-09-05", descripcion: "  netflix ", cantidad: 28000, categoria: "recibos", fecha: seg("2026-09-05") },
  { id: "g3", descripcion: "=SUMA(1+1)", cantidad: 1000, categoria: "comida", fecha: seg("2026-03-01") },
];
const recurrentes = [
  { id: "u1_2", descripcion: "Netflix", cantidad: 30000, categoria: "recibos", frecuencia: "mensual", dia: 5, mes: 0, proximaFecha: "2026-11-05", activo: true },
  { id: "u1_3", descripcion: "Gimnasio", cantidad: 90000, categoria: "recibos", frecuencia: "mensual", dia: 1, mes: 0, proximaFecha: "2026-10-01", activo: true },
  { id: "u1_4", descripcion: "Seguro", cantidad: 1200000, categoria: "recibos", frecuencia: "anual", dia: 20, mes: 4, proximaFecha: "2027-04-20", activo: false },
];
const armar = (periodo) => armarReporte({ gastos, recurrentes, porId, periodo, ahora: AHORA, correo: "ana@prueba.test" });

describe("reporte: periodos", () => {
  test("este mes, últimos 12 meses y todo", () => {
    expect(rangoDelPeriodo("mes", "2026-10-15")).toEqual({ desde: "2026-10-01", hasta: "2026-10-15" });
    expect(rangoDelPeriodo("12meses", "2026-10-15")).toEqual({ desde: "2025-11-01", hasta: "2026-10-15" });
    expect(rangoDelPeriodo("12meses", "2026-03-10")).toEqual({ desde: "2025-04-01", hasta: "2026-03-10" });
    expect(rangoDelPeriodo("todo", "2026-10-15")).toEqual({ desde: null, hasta: "2026-10-15" });
  });
  test("el filtro deja fuera lo anterior al periodo", () => {
    const viejo = { id: "g9", descripcion: "Gasto de 2025", cantidad: 500, categoria: "comida", fecha: seg("2025-01-10") };
    const con = (periodo) => armarReporte({ gastos: [...gastos, viejo], recurrentes, porId, periodo, ahora: AHORA }).detalle.length;
    expect(con("mes")).toBe(3);
    expect(con("12meses")).toBe(5); //el gasto de marzo de 2026 (hace 7 meses) sí entra; el de enero de 2025 no
    expect(con("todo")).toBe(6);
    expect(armar("mes").meta.etiquetaPeriodo).toBe("Este mes");
  });
});

describe("reporte: detalle y nombres intactos", () => {
  test("los nombres con espacios, comas, comillas y punto y coma quedan enteros (una sola celda)", () => {
    const d = armar("todo").detalle;
    expect(d.map((g) => g.nombre)).toContain('Cuota carro; "Bancolombia", octubre');
    expect(d.find((g) => g.nombre === "=SUMA(1+1)").monto).toBe(1000); //la fórmula se guarda como texto en el Excel
  });
  test("cada gasto lleva fecha, categoría, origen y monto numérico; más reciente primero", () => {
    const [primero] = armar("todo").detalle;
    expect(primero).toEqual({ fecha: "2026-10-05", nombre: "Cuota carro; \"Bancolombia\", octubre", categoria: "Créditos", origen: "Gasto", monto: 850000 });
    expect(armar("todo").detalle.find((g) => g.origen === "Pago recurrente").nombre).toBe("Netflix");
  });
});

describe("reporte: agrupar por nombre", () => {
  test("«Netflix» y «  netflix » son el mismo nombre; suma, promedio, primera y última fecha", () => {
    const n = armar("todo").porNombre.find((x) => x.nombre.toLowerCase() === "netflix");
    expect(n).toMatchObject({ veces: 2, total: 58000, promedio: 29000, primera: "2026-09-05", ultima: "2026-10-05", categoria: "Recibos", esPago: true });
  });
  test("ordenado por total de mayor a menor", () => {
    const totales = armar("todo").porNombre.map((n) => n.total);
    expect(totales).toEqual([...totales].sort((a, b) => b - a));
  });
});

describe("reporte: pagos recurrentes", () => {
  test("estado, próximo vencimiento, veces y total pagado en el periodo y última fecha pagada", () => {
    const { pagos } = armar("mes");
    const netflix = pagos.find((p) => p.nombre === "Netflix");
    expect(netflix).toMatchObject({ frecuencia: "Mensual · día 5", proximoVencimiento: "2026-11-05", monto: 30000, estado: "Al día", vecesPagado: 1, totalPagado: 30000, ultimaFechaPagada: "2026-10-05" });
    expect(pagos.find((p) => p.nombre === "Gimnasio")).toMatchObject({ estado: "Vencido", vecesPagado: 0, ultimaFechaPagada: null });
    expect(pagos.find((p) => p.nombre === "Seguro")).toMatchObject({ estado: "Pausado", frecuencia: "Anual · 20 de abril" });
  });
  test("la última fecha pagada mira todo el historial aunque el periodo sea corto", () => {
    expect(armar("mes").pagos.find((p) => p.nombre === "Netflix").ultimaFechaPagada).toBe("2026-10-05");
  });
  test("primero los activos por vencimiento y al final los pausados", () => {
    expect(armar("todo").pagos.map((p) => p.nombre)).toEqual(["Gimnasio", "Netflix", "Seguro"]);
  });
  test("id del gasto → id del pago, incluso con guion bajo en el id", () => {
    expect(idPagoDeGasto("rec_abc_2_2026-10-05")).toBe("abc_2");
    expect(idPagoDeGasto("g1")).toBeNull();
  });
});

describe("reporte: resumen", () => {
  test("totales, categorías con porcentaje y costo mensual de los pagos activos", () => {
    const r = armar("mes");
    expect(r.resumen).toMatchObject({ total: 915000, cantidad: 3, totalPagosRecurrentes: 30000, pagosActivos: 2, pagosMensualEstimado: 120000 });
    expect(r.porCategoria[0]).toMatchObject({ categoria: "Créditos", total: 850000, cantidad: 1 });
    expect(r.porCategoria.reduce((s, c) => s + c.porcentaje, 0)).toBeCloseTo(100, 0);
    expect(r.meta).toMatchObject({ correo: "ana@prueba.test", generado: "2026-10-15", desde: "2026-10-01" });
  });
  test("sin datos no falla", () => {
    const r = armarReporte({ gastos: [], recurrentes: [], porId, periodo: "mes", ahora: AHORA });
    expect(r.resumen).toMatchObject({ total: 0, cantidad: 0, pagosActivos: 0 });
    expect(r.porCategoria).toEqual([]);
  });
  test("nombre de archivo", () => {
    expect(nombreArchivoReporte(armar("mes"), "xlsx")).toBe("finanzas-reporte-2026-10-15.xlsx");
  });
});
