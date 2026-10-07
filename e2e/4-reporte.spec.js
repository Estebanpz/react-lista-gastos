const { test, expect } = require("@playwright/test");
const fs = require("fs");
const XLSX = require("xlsx-js-style");
const { correoUnico, registrarUsuario, sembrarDocumento, irA, esperarServiceWorker } = require("./utilidades");

const NOMBRE_RARO = 'Cuota carro; "Bancolombia", octubre  2026';
const ahoraSeg = () => Math.floor(Date.now() / 1000);
const hoyISO = () => new Date().toISOString().slice(0, 10);
const enDias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

//Gastos con nombres difíciles, un pago recurrente con su gasto «rec_…» y un gasto viejo de hace 2 años
const sembrar = async (uid) => {
  const base = { uidUsuario: uid };
  await sembrarDocumento("gastos/g_raro", { ...base, descripcion: NOMBRE_RARO, cantidad: 850000, categoria: "creditos", fecha: ahoraSeg() });
  await sembrarDocumento("gastos/g_formula", { ...base, descripcion: "=SUMA(1+1)", cantidad: 1000, categoria: "comida", fecha: ahoraSeg() });
  await sembrarDocumento("gastos/g_viejo", { ...base, descripcion: "Gasto muy viejo", cantidad: 500, categoria: "comida", fecha: ahoraSeg() - 2 * 365 * 86400 });
  await sembrarDocumento(`recurrentes/${uid}_1`, { ...base, descripcion: "Netflix premium", cantidad: 30000, categoria: "recibos", frecuencia: "mensual", dia: 5, mes: 0, proximaFecha: enDias(20), activo: true, creado: new Date() });
  await sembrarDocumento(`gastos/rec_${uid}_1_${hoyISO()}`, { ...base, descripcion: "Netflix premium", cantidad: 30000, categoria: "recibos", fecha: ahoraSeg() });
};

const descargar = async (page, boton) => {
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: boton }).click()]);
  return { nombre: descarga.suggestedFilename(), bytes: fs.readFileSync(await descarga.path()) };
};

test.describe("Reporte en Excel y PDF", () => {
  test("Excel real: nombres enteros en una celda, fechas y montos reales, pagos con su vencimiento", async ({ page }) => {
    const uid = await registrarUsuario(page, correoUnico("reporte"), { plan: "basico", diasVence: 30 });
    await sembrar(uid);
    await irA(page, "Mi plan");
    await page.getByRole("radio", { name: "Todo el historial" }).click();
    const { nombre, bytes } = await descargar(page, "Descargar Excel");
    expect(nombre).toMatch(/^finanzas-reporte-\d{4}-\d{2}-\d{2}\.xlsx$/);
    await expect(page.getByRole("status")).toContainText(nombre);

    expect(bytes.slice(0, 2).toString()).toBe("PK"); //un .xlsx es un zip, no texto
    const libro = XLSX.read(bytes, { type: "buffer", cellDates: true });
    expect(libro.SheetNames).toEqual(["Resumen", "Por nombre", "Pagos recurrentes", "Gastos"]);

    const gastos = XLSX.utils.sheet_to_json(libro.Sheets.Gastos, { header: 1 });
    expect(gastos[0]).toEqual(["Fecha", "Nombre", "Categoría", "Origen", "Monto"]);
    const raro = gastos.find((f) => f[1] === NOMBRE_RARO.replace(/\s+/g, " "));
    expect(raro).toBeTruthy(); //nombre completo (con espacios, comas, comillas y «;») en una sola celda
    expect(raro).toHaveLength(5);
    expect(raro[2]).toBe("Créditos");
    expect(raro[4]).toBe(850000);
    expect(gastos.find((f) => f[1] === "Netflix premium")[3]).toBe("Pago recurrente");
    expect(gastos.some((f) => f[1] === "Gasto muy viejo")).toBe(true);
    expect(Object.values(libro.Sheets.Gastos).find((c) => c && c.v === "=SUMA(1+1)").t).toBe("s");

    const pagos = XLSX.utils.sheet_to_json(libro.Sheets["Pagos recurrentes"], { header: 1 });
    expect(pagos[1].slice(0, 3)).toEqual(["Netflix premium", "Recibos", "Mensual · día 5"]);
    expect(pagos[1][4]).toBe(30000);
    expect(pagos[1][6]).toBe(1); //veces pagado
    expect(pagos[0]).toContain("Próximo vencimiento");
  });

  test("el periodo «Este mes» deja fuera lo viejo", async ({ page }) => {
    const uid = await registrarUsuario(page, correoUnico("reporte2"), { plan: "basico", diasVence: 30 });
    await sembrar(uid);
    await irA(page, "Mi plan");
    await expect(page.getByRole("radio", { name: "Este mes" })).toHaveAttribute("aria-checked", "true");
    const { bytes } = await descargar(page, "Descargar Excel");
    const gastos = XLSX.utils.sheet_to_json(XLSX.read(bytes, { type: "buffer" }).Sheets.Gastos, { header: 1 });
    expect(gastos.some((f) => f[1] === "Gasto muy viejo")).toBe(false);
    expect(gastos.some((f) => f[1] === "Netflix premium")).toBe(true);
  });

  test("PDF válido con varias secciones, aun con el plan vencido", async ({ page }) => {
    const uid = await registrarUsuario(page, correoUnico("reporte3"), { plan: "basico", diasVence: -3 });
    await sembrar(uid);
    await irA(page, "Mi plan");
    await page.getByRole("radio", { name: "Todo el historial" }).click();
    const { nombre, bytes } = await descargar(page, "Descargar PDF");
    expect(nombre).toMatch(/\.pdf$/);
    expect(bytes.slice(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(3000);
    expect((bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length).toBeGreaterThanOrEqual(1);
  });

  test("las librerías del reporte no se precargan al instalar la app (solo al pedir el reporte)", async ({ page }) => {
    await registrarUsuario(page, correoUnico("reporte4"), { plan: "basico", diasVence: 30 });
    await esperarServiceWorker(page);
    const mayor = await page.evaluate(async () => {
      const nombres = (await caches.keys()).filter((n) => n.includes("precache"));
      let mayor = 0;
      let exportar = 0;
      for (const n of nombres) {
        const cache = await caches.open(n);
        for (const peticion of await cache.keys()) {
          if (!/\/static\/js\//.test(peticion.url) || /\/main\./.test(peticion.url)) continue; //el principal es el único grande a propósito
          if (/exportar-/.test(peticion.url)) exportar++;
          const respuesta = await cache.match(peticion);
          mayor = Math.max(mayor, (await respuesta.blob()).size);
        }
      }
      return { mayor, exportar };
    });
    expect(mayor.exportar).toBe(0);
    expect(mayor.mayor).toBeLessThan(300000); //ni el chunk de xlsx (~1,2 MB) ni el de jsPDF (~0,4 MB) están en el precaché
  });
});
