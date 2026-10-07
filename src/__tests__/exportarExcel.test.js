import * as XLSX from "xlsx-js-style";
import { armarReporte } from "../functions/reporte";
import { construirExcel } from "../utils/exportarExcel";

const seg = (iso) => Math.floor(new Date(`${iso}T12:00:00-05:00`).getTime() / 1000);
const porId = (id) => ({ comida: { texto: "Comida" }, recibos: { texto: "Recibos" } }[id]);
const NOMBRE_RARO = 'Cuota carro; "Bancolombia", octubre  2026';

const reporte = armarReporte({
  gastos: [
    { id: "g1", descripcion: NOMBRE_RARO, cantidad: 850000, categoria: "comida", fecha: seg("2026-10-05") },
    { id: "rec_u_1_2026-10-05", descripcion: "Netflix", cantidad: 30000, categoria: "recibos", fecha: seg("2026-10-05") },
    { id: "g2", descripcion: "=SUMA(1+1)", cantidad: 1000, categoria: "comida", fecha: seg("2026-10-02") },
  ],
  recurrentes: [{ id: "u_1", descripcion: "Netflix", cantidad: 30000, categoria: "recibos", frecuencia: "mensual", dia: 5, mes: 0, proximaFecha: "2026-11-05", activo: true }],
  porId, periodo: "mes", ahora: new Date("2026-10-15T15:00:00Z"), correo: "ana@prueba.test",
});
const leer = () => XLSX.read(construirExcel(reporte), { type: "array" });

describe("Excel del reporte", () => {
  test("cuatro hojas con nombre", () => {
    expect(leer().SheetNames).toEqual(["Resumen", "Por nombre", "Gastos fijos (pagos)", "Gastos variables (gastos)"]);
  });

  test("un nombre con espacios, comas, comillas y «;» queda en UNA sola celda de texto", () => {
    const hoja = leer().Sheets["Gastos variables (gastos)"];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
    expect(filas[0]).toEqual(["Fecha", "Nombre", "Categoría", "Origen", "Monto"]);
    const fila = filas.find((f) => f[1] === NOMBRE_RARO.replace(/\s+/g, " "));
    expect(fila).toBeTruthy();
    expect(fila).toHaveLength(5); //fecha, nombre, categoría, origen, monto: ninguna columna de más
  });

  test("las fórmulas escritas como nombre se guardan como texto, no se ejecutan", () => {
    const hoja = leer().Sheets["Gastos variables (gastos)"];
    const celda = Object.values(hoja).find((c) => c && c.v === "=SUMA(1+1)");
    expect(celda.t).toBe("s");
    expect(celda.f).toBeUndefined();
  });

  test("monto = número y fecha = fecha real (con formato), no texto", () => {
    const hoja = leer().Sheets["Gastos variables (gastos)"];
    expect(hoja.E2.t).toBe("n");
    expect(typeof hoja.E2.v).toBe("number");
    expect(hoja.A2.t).toBe("n");
    const libro = XLSX.read(construirExcel(reporte), { type: "array", cellDates: true, cellNF: true });
    expect(libro.Sheets["Gastos variables (gastos)"].A2.t).toBe("d");
    expect(libro.Sheets["Gastos variables (gastos)"].A2.v.toISOString().slice(0, 10)).toBe("2026-10-05");
  });

  test("la hoja de pagos recurrentes trae nombre, frecuencia, vencimiento, monto y última fecha pagada", () => {
    const filas = XLSX.utils.sheet_to_json(leer().Sheets["Gastos fijos (pagos)"], { header: 1 });
    expect(filas[0]).toContain("Próximo vencimiento");
    expect(filas[0]).toContain("Última fecha pagada");
    expect(filas[1][0]).toBe("Netflix");
    expect(filas[1][2]).toBe("Mensual · día 5");
    expect(filas[1][4]).toBe(30000);
    expect(filas[1][5]).toBe("Al día");
  });

  test("resumen con total y categorías", () => {
    const filas = XLSX.utils.sheet_to_json(leer().Sheets.Resumen, { header: 1 });
    const total = filas.find((f) => f[0] === "Total gastado");
    expect(total[1]).toBe(881000);
    expect(filas.some((f) => f[0] === "Comida")).toBe(true);
  });
});
