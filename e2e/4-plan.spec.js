const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, enviarGasto, documentosEnEmulador } = require("./utilidades");

const LIMITES = { gastosMes: 2, pagosActivos: 3, categorias: 3, dispositivos: 1 };

test.describe("Plan del cliente", () => {
  test("plan vencido: aviso con WhatsApp y registro desactivado (solo lectura)", async ({ page }) => {
    await registrarUsuario(page, correoUnico("vencido"), { plan: "basico", diasVence: -3 });
    await expect(page.getByText(/Tu plan venció hace 3 días/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Renovar por WhatsApp" })).toHaveAttribute("href", /wa\.me/);
    await expect(page.getByRole("button", { name: /^guardar gasto/i })).toBeDisabled();
  });

  test("sin documento de plan: no puede registrar y se le explica", async ({ page }) => {
    await registrarUsuario(page, correoUnico("sinplan"), null);
    await expect(page.getByText(/todavía no tiene un plan asignado/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^guardar gasto/i })).toBeDisabled();
  });

  test("por vencer: aviso ámbar pero sigue registrando", async ({ page }) => {
    await registrarUsuario(page, correoUnico("porvencer"), { plan: "basico", diasVence: 2 });
    await expect(page.getByText(/Tu plan vence en 2 días/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^guardar gasto/i })).toBeEnabled();
  });

  test("límite mensual: el contador sube con cada gasto y al llegar al tope se bloquea", async ({ page }) => {
    await registrarUsuario(page, correoUnico("tope"), { plan: "prueba", estado: "prueba", diasVence: 20, limites: LIMITES });
    await enviarGasto(page, "Uno", 1000);
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();
    await page.getByRole("button", { name: "Registrar otro gasto" }).click();
    await enviarGasto(page, "Dos", 2000);
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();
    await page.getByRole("button", { name: "Registrar otro gasto" }).click();

    await expect(page.getByText(/Alcanzaste el límite de 2 gastos/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^guardar gasto/i })).toBeDisabled();
    const uso = await documentosEnEmulador("uso");
    expect(uso.map((d) => Number(d.gastos))).toContain(2);
  });

  test("Mi plan muestra el plan y el uso del mes", async ({ page }) => {
    await registrarUsuario(page, correoUnico("miplan"), { plan: "basico", diasVence: 30 });
    await enviarGasto(page, "Almuerzo", 35000, "Comida");
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();

    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Mi plan" }).click();
    await expect(page.getByRole("heading", { name: "Mi plan" })).toBeVisible();
    await expect(page.getByText("Básico", { exact: true })).toBeVisible();
    await expect(page.getByRole("meter", { name: /Gastos registrados este mes/ })).toHaveAttribute("aria-valuenow", "1");
  });

  test("Mi plan con el plan vencido: aviso de renovación y la descarga sigue disponible", async ({ page }) => {
    await registrarUsuario(page, correoUnico("miplan-vencido"), { plan: "basico", diasVence: -3 });
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Mi plan" }).click();
    await expect(page.getByRole("link", { name: "Renovar por WhatsApp" }).last()).toHaveAttribute("href", /wa\.me/);
    await expect(page.getByRole("button", { name: "Descargar Excel" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeEnabled();
  });
});
