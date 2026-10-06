//Solo con CAPTURAS_DIR=<carpeta>: fotografía el panel de super admin (PC y móvil) con clientes de ejemplo.
const { test } = require("@playwright/test");
const { correoUnico, crearCuenta, registrarUsuario } = require("./utilidades");

const DIR = process.env.CAPTURAS_DIR;
test.skip(!DIR, "Definir CAPTURAS_DIR para generar capturas");


const sembrarClientes = async () => {
  const SUF = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  await crearCuenta("ana.vencida-" + SUF + "@prueba.test", { plan: "basico", diasVence: -4 });
  await crearCuenta("beto.por-vencer-" + SUF + "@prueba.test", { plan: "plus", diasVence: 2 });
  await crearCuenta("carla.activa-" + SUF + "@prueba.test", { plan: "negocio", diasVence: 18 });
  await crearCuenta("diego.prueba-" + SUF + "@prueba.test", { plan: "prueba", estado: "prueba", diasVence: 12, });
  await crearCuenta("eva.suspendida-" + SUF + "@prueba.test", { plan: "basico", estado: "suspendido", diasVence: 10 });
};

const entrar = async (page) => {
  await sembrarClientes();
  await registrarUsuario(page, correoUnico("admin"), { admin: true });
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Clientes" }).click();
  await page.getByRole("heading", { name: "Clientes" }).waitFor();
  await page.waitForTimeout(1500);
};

test("admin en escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrar(page);
  await page.screenshot({ path: `${DIR}/admin_pc_lista.png` });
  await page.getByRole("button", { name: /ana.vencida/ }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/admin_pc_detalle.png` });
});

test.describe("móvil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  test("admin en el móvil", async ({ page }) => {
    await entrar(page);
    await page.screenshot({ path: `${DIR}/admin_movil_lista.png` });
    await page.getByRole("button", { name: /ana.vencida/ }).first().tap();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${DIR}/admin_movil_detalle.png` });
  });
});

test("Mi plan en PC y móvil", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await registrarUsuario(page, correoUnico("cliente"), { plan: "plus", diasVence: 5, limites: { gastosMes: 20, pagosActivos: 25, categorias: 20, dispositivos: 5, mesesHistorial: 36 } });
  for (const [d, m] of [["Pago de nómina", 1200000], ["Almuerzo", 35000], ["Taxi", 22000]]) {
    await page.getByLabel("Valor del gasto (COP)").fill(String(m));
    await page.getByLabel("Detalle").fill(d);
    await page.getByRole("button", { name: /^guardar gasto/i }).click();
    await page.getByText("¡Gasto guardado!").waitFor();
    await page.getByRole("button", { name: "Registrar otro gasto" }).click();
  }
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Mi plan" }).click();
  await page.getByRole("heading", { name: "Mi plan" }).waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${DIR}/plan_pc.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/plan_movil.png`, fullPage: true });
});
