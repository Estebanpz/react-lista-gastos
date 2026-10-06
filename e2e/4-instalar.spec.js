const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, irA } = require("./utilidades");

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.6167.138 Mobile/15E148 Safari/604.1";

test.describe("Instalar la app en iPhone (Safari)", () => {
  test.use({ userAgent: IPHONE, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("el aviso de Inicio abre una guía de 3 pasos y se cierra con Escape", async ({ page }) => {
    await registrarUsuario(page, correoUnico("ios"));
    const aviso = page.getByLabel("Instalar la aplicación");
    await expect(aviso).toBeVisible();
    await aviso.getByRole("button", { name: "Ver cómo instalar" }).tap();
    const guia = page.getByRole("dialog", { name: "Instalar en tu iPhone" });
    await expect(guia).toBeVisible();
    await expect(guia.getByRole("listitem")).toHaveCount(3);
    await expect(guia.getByText("2. Toca «Agregar a pantalla de inicio»")).toBeVisible();
    await expect(guia.getByText(/Abrir como app web/).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(guia).toBeHidden();
  });

  test("«Mi plan» siempre ofrece cómo instalar, aunque se haya descartado el aviso", async ({ page }) => {
    await registrarUsuario(page, correoUnico("ios2"));
    await page.getByLabel("Instalar la aplicación").getByRole("button", { name: "Ahora no" }).tap();
    await irA(page, "Mi plan");
    await page.getByRole("button", { name: "Cómo instalar la app" }).tap();
    await expect(page.getByRole("dialog", { name: "Instalar en tu iPhone" })).toBeVisible();
    await page.keyboard.press("Escape");
  });
});

test.describe("Instalar la app en iPhone (Chrome)", () => {
  test.use({ userAgent: IPHONE_CHROME, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("explica el menú de Chrome y que, si no aparece la opción, se use Safari", async ({ page }) => {
    await registrarUsuario(page, correoUnico("ios3"));
    await page.getByLabel("Instalar la aplicación").getByRole("button", { name: "Ver cómo instalar" }).tap();
    const guia = page.getByRole("dialog", { name: "Instalar en tu iPhone" });
    await expect(guia.getByText(/En Chrome toca el icono Compartir/)).toBeVisible();
    await expect(guia.getByText(/abre la página en Safari y repite/i)).toBeVisible();
  });
});

test.describe("En escritorio", () => {
  test("no se muestra la guía de iPhone", async ({ page }) => {
    await registrarUsuario(page, correoUnico("pc"));
    await expect(page.getByRole("button", { name: "Ver cómo instalar" })).toHaveCount(0);
    await irA(page, "Mi plan");
    await expect(page.getByRole("button", { name: "Cómo instalar la app" })).toHaveCount(0);
  });
});
