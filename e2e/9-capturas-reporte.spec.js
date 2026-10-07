//Solo con CAPTURAS_DIR=<carpeta>: guarda un PDF y un Excel de ejemplo para revisarlos a ojo.
const { test } = require("@playwright/test");
const fs = require("fs");
const { correoUnico, registrarUsuario, sembrarDocumento, irA } = require("./utilidades");

const DIR = process.env.CAPTURAS_DIR;
test.skip(!DIR, "Definir CAPTURAS_DIR para generar capturas");

test("reporte de ejemplo", async ({ page }) => {
  const uid = await registrarUsuario(page, correoUnico("ejemplo"), { plan: "plus", diasVence: 20 });
  const ahora = Math.floor(Date.now() / 1000);
  const hoy = new Date().toISOString().slice(0, 10);
  const gastos = [
    ["Cuota carro; \"Bancolombia\", octubre", 850000, "creditos", 0], ["Almuerzo con el equipo de ventas", 85000, "comida", 1], ["Taxi aeropuerto", 62000, "transporte", 2],
    ["Pago de nómina colaboradores", 4200000, "nomina", 3], ["Recibo de energía", 212500, "recibos", 4], ["Almuerzo con el equipo de ventas", 78000, "comida", 9],
    ["Impuesto de industria y comercio", 180000, "impuestos", 12], ["Cena 😀 cumpleaños", 150000, "comida", 15],
  ];
  for (const [i, [d, m, c, dias]] of gastos.entries()) await sembrarDocumento(`gastos/g${i}`, { uidUsuario: uid, descripcion: d, cantidad: m, categoria: c, fecha: ahora - dias * 86400 });
  await sembrarDocumento(`recurrentes/${uid}_1`, { uidUsuario: uid, descripcion: "Netflix premium", cantidad: 30000, categoria: "recibos", frecuencia: "mensual", dia: 5, mes: 0, proximaFecha: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), activo: true, creado: new Date() });
  await sembrarDocumento(`recurrentes/${uid}_2`, { uidUsuario: uid, descripcion: "Nómina quincenal", cantidad: 2100000, categoria: "nomina", frecuencia: "quincenal", dia: 0, mes: 0, proximaFecha: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), activo: true, creado: new Date() });
  await sembrarDocumento(`gastos/rec_${uid}_1_${hoy}`, { uidUsuario: uid, descripcion: "Netflix premium", cantidad: 30000, categoria: "recibos", fecha: ahora });
  await irA(page, "Mi plan");
  await page.getByRole("radio", { name: "Todo el historial" }).click();
  for (const [boton, archivo] of [["Descargar PDF", "reporte.pdf"], ["Descargar Excel", "reporte.xlsx"]]) {
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: boton }).click()]);
    fs.copyFileSync(await d.path(), `${DIR}/${archivo}`);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/mi_plan_descargas.png`, fullPage: true });
});

test.describe("móvil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  test("menú y gastos fijos en el móvil", async ({ page }) => {
    const uid = await registrarUsuario(page, correoUnico("movilfijos"), { plan: "plus", diasVence: 20 });
    await sembrarDocumento(`recurrentes/${uid}_1`, { uidUsuario: uid, descripcion: "Nómina quincenal colaboradores", cantidad: 2100000, categoria: "nomina", frecuencia: "quincenal", dia: 0, mes: 0, proximaFecha: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), activo: true, creado: new Date() });
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Fijos" }).tap();
    await page.getByRole("heading", { name: "Gastos fijos (pagos)" }).waitFor();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${DIR}/movil_gastos_fijos.png` });
    await page.getByRole("button", { name: /Nuevo gasto fijo/ }).tap();
    await page.getByLabel("Monto (COP)").fill("2100000");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/movil_nuevo_gasto_fijo.png` });
  });
});

test.describe("móvil inicio", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  test("inicio y selector de agregar", async ({ page }) => {
    const uid = await registrarUsuario(page, correoUnico("movilinicio"), { plan: "plus", diasVence: 20 });
    const ahora = Math.floor(Date.now() / 1000);
    const hoy = new Date().toISOString().slice(0, 10);
    await sembrarDocumento("gastos/g1", { uidUsuario: uid, descripcion: "Pantalla", cantidad: 100000, categoria: "cuentas y pagos", fecha: ahora });
    await sembrarDocumento(`gastos/rec_${uid}_1_${hoy}`, { uidUsuario: uid, descripcion: "Tarjeta de crédito", cantidad: 500000, categoria: "creditos", fecha: ahora });
    await sembrarDocumento(`recurrentes/${uid}_1`, { uidUsuario: uid, descripcion: "Tarjeta de crédito", cantidad: 500000, categoria: "creditos", frecuencia: "mensual", dia: 23, mes: 0, proximaFecha: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), activo: true, creado: new Date() });
    await page.reload();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${DIR}/movil_inicio_fijos_variables.png` });
    await page.getByRole("button", { name: "Agregar", exact: true }).tap();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/movil_agregar_elegir.png` });
  });
});
