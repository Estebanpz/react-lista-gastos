const { test, expect } = require("@playwright/test");
const construir = require("../scripts/construir-e2e");
const { esperarServiceWorker } = require("./utilidades");

//Debe ser el ÚLTIMO archivo: recompila la app (v2) y deja build-e2e en esa versión.
test.describe("Actualización de la app", () => {
  test("una versión nueva avisa y solo se aplica al pulsar «Actualizar»", async ({ page }) => {
    test.setTimeout(240_000);

    await page.goto("/inicio-sesion");
    await esperarServiceWorker(page);
    await page.reload(); //ahora la página ya nace controlada: una versión nueva será una ACTUALIZACIÓN
    await esperarServiceWorker(page);
    expect(await page.evaluate(() => window.__versionApp)).toBe("e2e-v1");
    await expect(page.getByText("Hay una versión nueva de la app.")).toHaveCount(0);

    //se publica la v2 mientras la persona sigue en la v1
    construir("e2e-v2");

    await page.evaluate(async () => {
      const registro = await navigator.serviceWorker.getRegistration();
      await registro.update();
    });
    await expect(page.getByText("Hay una versión nueva de la app.")).toBeVisible({ timeout: 30_000 });

    //«Más tarde» no cambia nada: sigue en la v1
    await page.getByRole("button", { name: "Más tarde" }).click();
    await expect(page.getByText("Hay una versión nueva de la app.")).toHaveCount(0);
    expect(await page.evaluate(() => window.__versionApp)).toBe("e2e-v1");

    //recargando manualmente tampoco se activa sola: el aviso vuelve a aparecer
    await page.reload();
    await expect(page.getByText("Hay una versión nueva de la app.")).toBeVisible({ timeout: 30_000 });
    expect(await page.evaluate(() => window.__versionApp)).toBe("e2e-v1");

    //«Actualizar»: se activa la v2 y la página se recarga sola, una vez
    await page.getByRole("button", { name: "Actualizar" }).click();
    await page.waitForFunction(() => window.__versionApp === "e2e-v2", null, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 2, name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText("Hay una versión nueva de la app.")).toHaveCount(0);
  });
});
