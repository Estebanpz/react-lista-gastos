import { armarReporte } from "../functions/reporte";
import { construirPdf, construirPdfBytes, limpiarParaPdf, fechaCorta } from "../utils/exportarPdf";

const seg = (iso) => Math.floor(new Date(`${iso}T12:00:00-05:00`).getTime() / 1000);
const porId = (id) => ({ comida: { texto: "Comida" }, recibos: { texto: "Recibos" } }[id]);
const AHORA = new Date("2026-10-15T15:00:00Z");
const recurrentes = [{ id: "u_1", descripcion: "Netflix", cantidad: 30000, categoria: "recibos", frecuencia: "mensual", dia: 5, mes: 0, proximaFecha: "2026-11-05", activo: true }];

const reporteCon = (gastos) => armarReporte({ gastos, recurrentes, porId, periodo: "todo", ahora: AHORA, correo: "ana@prueba.test" });

//jsPDF intenta usar canvas, que jsdom no trae: el aviso no afecta al PDF y ensucia la salida
beforeAll(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterAll(() => console.error.mockRestore());

describe("PDF del reporte", () => {
  test("genera un PDF válido con los datos y una sola página cuando hay pocos", () => {
    const r = reporteCon([{ id: "g1", descripcion: "Almuerzo con ñandú", cantidad: 35000, categoria: "comida", fecha: seg("2026-10-03") }]);
    const bytes = new Uint8Array(construirPdfBytes(r));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
    expect(construirPdf(r).getNumberOfPages()).toBe(1);
  });

  test("con cientos de gastos pagina el detalle", () => {
    const muchos = Array.from({ length: 300 }, (_, i) => ({ id: `g${i}`, descripcion: `Gasto número ${i} con nombre largo para probar el ajuste de línea`, cantidad: 1000 + i, categoria: "comida", fecha: seg("2026-10-03") }));
    expect(construirPdf(reporteCon(muchos)).getNumberOfPages()).toBeGreaterThan(5);
  });

  test("sin datos igual genera el PDF (con avisos de «sin gastos»)", () => {
    const doc = construirPdf(armarReporte({ gastos: [], recurrentes: [], porId, periodo: "mes", ahora: AHORA }));
    expect(doc.getNumberOfPages()).toBe(1);
  });

  test("tildes y ñ se conservan; emojis y símbolos fuera de Helvetica pasan a «?»", () => {
    expect(limpiarParaPdf("Año pequeño: café, ¿qué tal?")).toBe("Año pequeño: café, ¿qué tal?");
    expect(limpiarParaPdf("Cena 😀 ✓")).toBe("Cena ? ?");
    expect(limpiarParaPdf("línea\nnueva\tcon tab")).toBe("línea nueva con tab");
    expect(limpiarParaPdf(null)).toBe("");
  });

  test("fechas dd/mm/aaaa", () => {
    expect(fechaCorta("2026-10-05")).toBe("05/10/2026");
    expect(fechaCorta(null)).toBe("—");
  });
});
