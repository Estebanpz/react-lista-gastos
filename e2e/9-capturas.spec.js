//Solo se ejecuta con CAPTURAS_DIR=<carpeta>: siembra datos y fotografía cada pantalla (PC y móvil).
const { test } = require("@playwright/test");
const { correoUnico, registrarUsuario, deslizar, elegirFecha } = require("./utilidades");

const DIR = process.env.CAPTURAS_DIR;
test.skip(!DIR, "Definir CAPTURAS_DIR para generar capturas");

const GASTOS = [
  ["Pago de nómina", 1200000, "Nómina", 0], ["Arriendo local comercial", 850000, "Hogar", 1], ["Recibo de energía", 212500, "Recibos", 1],
  ["Cuota del crédito", 450000, "Créditos", 2], ["Almuerzo de trabajo", 85000, "Comida", 0], ["Taxi aeropuerto", 62000, "Transporte", 3],
  ["Impuesto de industria y comercio", 180000, "Impuestos", 4], ["Cine con la familia", 56000, "Diversión", 2], ["Camiseta del equipo", 98000, "Ropa", 3],
];

const aFecha = (diasAtras) => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const sembrar = async (page) => {
  await registrarUsuario(page, correoUnico("capt"));
  //categoría propia
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Categorías" }).click();
  await page.getByRole("button", { name: "Nueva categoría" }).click();
  const hoja = page.getByRole("dialog", { name: "Crear categoría" });
  await hoja.getByLabel("Nombre").fill("Publicidad");
  await hoja.getByRole("radio", { name: "Megáfono" }).click();
  await hoja.getByRole("radio", { name: "Rosa" }).click();
  await hoja.getByRole("button", { name: "Crear categoría" }).click();
  await hoja.waitFor({ state: "hidden" });
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Inicio" }).click();
  const todos = [...GASTOS, ["Pauta en redes sociales", 300000, "Publicidad", 1]];
  for (const [desc, monto, cat, dias] of todos) {
    await page.getByLabel("Valor del gasto (COP)").fill(String(monto));
    await page.getByRole("radio", { name: cat }).click();
    if (dias) { const [a, m, d] = aFecha(dias).split("-").map(Number); await elegirFecha(page, a, m, d); }
    await page.getByLabel("Detalle").fill(desc);
    await page.getByRole("button", { name: /^guardar gasto/i }).click();
    await page.getByText("¡Gasto guardado!").waitFor();
    await page.getByRole("button", { name: "Registrar otro gasto" }).click();
  }
};

test("capturas en escritorio", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await sembrar(page);
  const nav = (n) => page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: n });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/pc_inicio.png` });
  await nav("Gastos variables").click();
  await page.getByText("Pago de nómina").click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${DIR}/pc_lista.png` });
  await page.getByLabel("Detalle del gasto").getByRole("button", { name: /borrar/i }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${DIR}/pc_borrar.png` });
  await page.keyboard.press("Escape");
  await nav("Categorías").click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${DIR}/pc_categorias.png` });
  await page.getByRole("button", { name: "Nueva categoría" }).click();
  await page.getByRole("dialog").getByLabel("Nombre").fill("Gimnasio");
  await page.getByRole("dialog").getByRole("radio", { name: "Huella" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${DIR}/pc_crear_categoria.png` });
});

test.describe("móvil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  test("capturas en el móvil", async ({ page }) => {
    test.setTimeout(240_000);
    //se siembra en escritorio (más rápido) y se fotografía en móvil con la misma sesión
    await page.setViewportSize({ width: 1440, height: 900 });
    await sembrar(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${DIR}/movil_inicio.png` });
    await page.getByRole("button", { name: "Agregar", exact: true }).tap();
    await page.getByRole("button", { name: /Gasto variable/ }).tap();
    await page.getByRole("dialog").getByLabel("Valor del gasto (COP)").fill("45000");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/movil_registro.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Variables" }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DIR}/movil_lista.png` });
    const fila = page.getByRole("button", { name: /Almuerzo de trabajo/ });
    const caja = await fila.boundingBox();
    await deslizar(page, 340, 80, caja.y + caja.height / 2);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/movil_lista_deslizada.png` });
    await page.getByRole("button", { name: "Borrar", exact: true }).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${DIR}/movil_borrar.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Categorías" }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DIR}/movil_categorias.png` });
    await page.getByRole("button", { name: "Nueva categoría" }).tap();
    await page.getByRole("dialog").getByLabel("Nombre").fill("Gimnasio");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/movil_crear_categoria.png` });
  });
});
