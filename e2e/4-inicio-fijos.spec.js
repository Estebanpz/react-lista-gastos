const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, sembrarDocumento } = require("./utilidades");

test("Inicio separa gastos variables y fijos: desglose del mes y lista solo de variables", async ({ page }) => {
  const uid = await registrarUsuario(page, correoUnico("inicio-fijos"), { plan: "plus", diasVence: 20 });
  const ahora = Math.floor(Date.now() / 1000);
  const hoy = new Date().toISOString().slice(0, 10);
  await sembrarDocumento("gastos/g1", { uidUsuario: uid, descripcion: "Pantalla", cantidad: 70000, categoria: "cuentas y pagos", fecha: ahora });
  await sembrarDocumento(`gastos/rec_${uid}_1_${hoy}`, { uidUsuario: uid, descripcion: "Tarjeta de crédito", cantidad: 30000, categoria: "creditos", fecha: ahora });
  await page.reload();

  const desglose = page.getByRole("group", { name: "Desglose del mes" }).or(page.locator('dl[aria-label="Desglose del mes"]'));
  await expect(desglose).toContainText("Variables (gastos)");
  await expect(desglose).toContainText("70.000");
  await expect(desglose).toContainText("Fijos (pagos)");
  await expect(desglose).toContainText("30.000");
  await expect(page.getByText(/\$\s?100\.000/).first()).toBeVisible(); //total del mes

  const ultimos = page.getByRole("region", { name: "Últimos gastos variables (gastos)" });
  await expect(ultimos).toContainText("Pantalla");
  await expect(ultimos).not.toContainText("Tarjeta de crédito"); //el fijo no se mezcla con los variables
});
