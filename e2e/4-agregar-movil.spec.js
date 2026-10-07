const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario } = require("./utilidades");

test.describe("Botón «Agregar» en el móvil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("ofrece gasto variable o gasto fijo y la barra inferior usa los mismos nombres", async ({ page }) => {
    await registrarUsuario(page, correoUnico("agregar"), { plan: "plus", diasVence: 20 });
    const menu = page.getByRole("navigation", { name: "Principal" });
    await expect(menu.getByRole("link", { name: "Variables" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Fijos" })).toBeVisible();

    await page.getByRole("button", { name: "Agregar", exact: true }).tap();
    const eleccion = page.getByRole("dialog", { name: "¿Qué quieres agregar?" });
    await expect(eleccion.getByRole("button", { name: /Gasto variable \(gasto\)/ })).toBeVisible();
    await expect(eleccion.getByRole("button", { name: /Gasto fijo \(pago\)/ })).toBeVisible();

    //Gasto fijo: abre el formulario de pago recurrente y se guarda desde Inicio
    await eleccion.getByRole("button", { name: /Gasto fijo \(pago\)/ }).tap();
    const hoja = page.getByRole("dialog", { name: "Nuevo gasto fijo (pago recurrente)" });
    await hoja.getByLabel("Qué pago es").fill("Arriendo local");
    await hoja.getByLabel("Monto (COP)").fill("1500000");
    await hoja.getByRole("button", { name: /Guardar pago/ }).tap();
    await expect(hoja).toBeHidden();
    await expect(page.getByRole("region", { name: "Próximos gastos fijos (pagos)" })).toContainText("Arriendo local");

    //Gasto variable: abre el registro rápido
    await page.getByRole("button", { name: "Agregar", exact: true }).tap();
    await page.getByRole("dialog", { name: "¿Qué quieres agregar?" }).getByRole("button", { name: /Gasto variable \(gasto\)/ }).tap();
    await expect(page.getByRole("dialog", { name: "Nuevo gasto variable" })).toBeVisible();
  });
});
