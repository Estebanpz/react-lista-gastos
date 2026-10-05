import { getUnixTime } from "date-fns";
import { totalGastos, porCategoria, acumuladoPorDia, agruparPorDia, agruparPorCategoria, filtrarGastos, ordenarGastos, etiquetaDia, rangoMes } from "../functions/resumen";

const g = (id, cantidad, categoria, dia, descripcion = "Gasto", hora = 10) => ({
  id, cantidad, categoria, descripcion, fecha: getUnixTime(new Date(2026, 9, dia, hora, 0, 0)),
});

const gastos = [
  g("a", 100000, "comida", 4, "Almuerzo de trabajo"),
  g("b", 50000, "comida", 4, "Café"),
  g("c", 850000, "nomina", 3, "Pago de nómina"),
  g("d", 30000, "transporte", 1, "Taxi aeropuerto"),
];

describe("resumen", () => {
  test("totalGastos suma incluso cantidades guardadas como texto", () => {
    expect(totalGastos(gastos)).toBe(1030000);
    expect(totalGastos([{ cantidad: "500" }, { cantidad: 250.5 }])).toBe(750.5);
    expect(totalGastos([])).toBe(0);
  });

  test("porCategoria ordena de mayor a menor y calcula porcentajes", () => {
    const r = porCategoria(gastos);
    expect(r.map((c) => c.id)).toEqual(["nomina", "comida", "transporte"]);
    expect(r[1]).toMatchObject({ total: 150000, cuenta: 2 });
    expect(r.reduce((a, c) => a + c.porcentaje, 0)).toBeCloseTo(100, 5);
    expect(porCategoria([])).toEqual([]);
  });

  test("acumuladoPorDia llega hasta hoy en el mes en curso", () => {
    const hoy = new Date(2026, 9, 5);
    const r = acumuladoPorDia(gastos, hoy, hoy);
    expect(r).toHaveLength(5);
    expect(r[0]).toMatchObject({ dia: 1, total: 30000, acumulado: 30000 });
    expect(r[3]).toMatchObject({ dia: 4, total: 150000, acumulado: 1030000 });
    expect(r[4].acumulado).toBe(1030000); //sin gastos el día 5 se mantiene
  });

  test("acumuladoPorDia de un mes pasado cubre todos sus días", () => {
    expect(acumuladoPorDia([], new Date(2026, 8, 10), new Date(2026, 9, 5))).toHaveLength(30);
  });

  test("agruparPorDia pone primero el día más reciente y suma cada día", () => {
    const grupos = agruparPorDia(gastos);
    expect(grupos.map((x) => x.subtotal)).toEqual([150000, 850000, 30000]);
    expect(grupos[0].gastos).toHaveLength(2);
  });

  test("agruparPorCategoria agrupa los gastos de cada una", () => {
    const grupos = agruparPorCategoria(gastos);
    expect(grupos[0].id).toBe("nomina");
    expect(grupos.find((x) => x.id === "comida").gastos).toHaveLength(2);
  });

  test("filtrarGastos busca sin distinguir mayúsculas ni tildes", () => {
    expect(filtrarGastos(gastos, { texto: "NOMINA" }).map((x) => x.id)).toEqual(["c"]);
    expect(filtrarGastos(gastos, { texto: "cafe" }).map((x) => x.id)).toEqual(["b"]);
    expect(filtrarGastos(gastos, { texto: "  " })).toHaveLength(4);
  });

  test("filtrarGastos combina texto y categorías", () => {
    expect(filtrarGastos(gastos, { categorias: ["comida"] })).toHaveLength(2);
    expect(filtrarGastos(gastos, { categorias: ["comida"], texto: "almuerzo" }).map((x) => x.id)).toEqual(["a"]);
    expect(filtrarGastos(gastos, { categorias: ["hogar"] })).toEqual([]);
  });

  test("ordenarGastos no modifica la lista original", () => {
    const original = [...gastos];
    expect(ordenarGastos(gastos, "mayor").map((x) => x.id)).toEqual(["c", "a", "b", "d"]);
    expect(ordenarGastos(gastos, "menor")[0].id).toBe("d");
    expect(ordenarGastos(gastos, "antiguo")[0].id).toBe("d");
    expect(ordenarGastos(gastos, "reciente")[0].id).toBe("a");
    expect(gastos).toEqual(original);
  });

  test("etiquetaDia usa «Hoy», «Ayer» y el nombre del día", () => {
    const hoy = new Date(2026, 9, 5, 12);
    expect(etiquetaDia(new Date(2026, 9, 5, 8), hoy)).toMatch(/^Hoy, 5 de octubre/);
    expect(etiquetaDia(new Date(2026, 9, 4, 8), hoy)).toMatch(/^Ayer, 4 de octubre/);
    expect(etiquetaDia(new Date(2026, 9, 1, 8), hoy)).toMatch(/^(J|j)ueves,? 1 de octubre/i);
  });

  test("rangoMes cubre del primer al último segundo del mes", () => {
    const [d, h] = rangoMes(new Date(2026, 9, 15));
    expect(d).toBe(getUnixTime(new Date(2026, 9, 1, 0, 0, 0)));
    expect(h).toBe(getUnixTime(new Date(2026, 9, 31, 23, 59, 59)));
  });
});

describe("rangos de período", () => {
  const { rangoSemana, rangoTrimestre, rangoDias, etiquetaRango } = require("../functions/resumen");
  const f = (s) => new Date(s * 1000);

  it("la semana va de lunes a domingo", () => {
    const [d, h] = rangoSemana(new Date(2026, 9, 7)); //miércoles
    expect(f(d).getDate()).toBe(5);
    expect(f(h).getDate()).toBe(11);
  });
  it("3 meses terminan en el mes dado, incluso cruzando el año", () => {
    const [d, h] = rangoTrimestre(new Date(2026, 1, 10));
    expect([f(d).getFullYear(), f(d).getMonth(), f(d).getDate()]).toEqual([2025, 11, 1]);
    expect([f(h).getMonth(), f(h).getDate()]).toEqual([1, 28]);
  });
  it("días elegidos: inclusivo de principio a fin del día", () => {
    const [d, h] = rangoDias(new Date(2026, 8, 3, 15), new Date(2026, 8, 12, 2));
    expect([f(d).getDate(), f(d).getHours()]).toEqual([3, 0]);
    expect([f(h).getDate(), f(h).getHours()]).toEqual([12, 23]);
  });
  it("etiquetas del rango", () => {
    const hoy = new Date(2026, 9, 5);
    expect(etiquetaRango(new Date(2026, 9, 5), new Date(2026, 9, 11), hoy)).toMatch(/^5 – 11 de oct/);
    expect(etiquetaRango(new Date(2026, 8, 28), new Date(2026, 9, 4), hoy)).toMatch(/^28 de sep.* – 4 de oct/);
    expect(etiquetaRango(new Date(2025, 11, 30), new Date(2026, 0, 2), hoy)).toMatch(/2025/);
  });
});
