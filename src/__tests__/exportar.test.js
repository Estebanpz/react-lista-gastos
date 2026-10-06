import { gastosACsv, fechaISO } from "../functions/exportar";

const nombre = (id) => ({ comida: "Comida", nomina: "Nómina" }[id] || "Sin categoría");
const seg = (txt) => Math.floor(new Date(txt).getTime() / 1000);

describe("exportar gastos", () => {
  test("encabezado, orden por fecha descendente y valor numérico plano", () => {
    const csv = gastosACsv(
      [
        { descripcion: "Almuerzo", cantidad: 35000, categoria: "comida", fecha: seg("2026-10-01T12:00:00") },
        { descripcion: "Quincena", cantidad: 1200000.5, categoria: "nomina", fecha: seg("2026-10-05T12:00:00") },
      ],
      nombre
    );
    expect(csv.startsWith("﻿Fecha;Descripción;Categoría;Valor (COP)\r\n")).toBe(true);
    const filas = csv.split("\r\n").slice(1);
    expect(filas).toEqual(["2026-10-05;Quincena;Nómina;1200000.5", "2026-10-01;Almuerzo;Comida;35000"]);
  });
  test("escapa comillas y separadores y neutraliza fórmulas", () => {
    const csv = gastosACsv(
      [
        { descripcion: 'Pizza "grande"; con queso', cantidad: 1, categoria: "comida", fecha: seg("2026-10-01T12:00:00") },
        { descripcion: "=HYPERLINK(\"x\")", cantidad: 2, categoria: "otra", fecha: seg("2026-10-02T12:00:00") },
      ],
      nombre
    );
    expect(csv).toContain('"Pizza ""grande""; con queso"');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("Sin categoría");
  });
  test("sin gastos solo trae el encabezado", () => {
    expect(gastosACsv([], nombre)).toBe("﻿Fecha;Descripción;Categoría;Valor (COP)\r\n");
    expect(fechaISO(seg("2026-01-09T12:00:00"))).toBe("2026-01-09");
  });
});
