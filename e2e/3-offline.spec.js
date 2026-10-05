const { test, expect } = require("@playwright/test");
const { RUTA_EMULADORES, correoUnico, registrarUsuario, enviarGasto, esperarServiceWorker, gastosEnEmulador } = require("./utilidades");

test.describe("Offline: app y datos", () => {
  test("abre sin conexión, muestra lo ya visto, guarda en cola y sincroniza al volver", async ({ page, context }) => {
    //-- con conexión: cuenta, primer gasto y lista
    await registrarUsuario(page, correoUnico("offline"));
    await esperarServiceWorker(page);
    await enviarGasto(page, "Arriendo", 1500);
    await expect(page.getByText("Gasto Agregado Correctamente")).toBeVisible();
    await page.getByRole("link", { name: "Lista de Gastos" }).click();
    await expect(page.getByText("Arriendo")).toBeVisible();

    //-- sin conexión (se corta el navegador Y los emuladores, para que sea real)
    const cortarEmuladores = (ruta) => ruta.abort("internetdisconnected");
    await context.route(RUTA_EMULADORES, cortarEmuladores);
    await context.setOffline(true);

    await page.reload(); //la app abre desde el precaché del service worker
    await expect(page.getByRole("heading", { name: "Lista de Gastos" })).toBeVisible();
    await expect(page.getByText("Arriendo")).toBeVisible(); //dato desde la caché de Firestore
    await expect(page.getByRole("status").filter({ hasText: /sin conexión/i })).toBeVisible();

    //un gasto nuevo sin conexión: la app no se queda colgada y avisa que quedó en cola
    await page.getByRole("button", { name: "Volver" }).click();
    await enviarGasto(page, "Mercado offline", 2500);
    await expect(page.getByText(/guardado sin conexión/i)).toBeVisible({ timeout: 20_000 });
    expect(await gastosEnEmulador()).not.toContain("Mercado offline"); //aún no llegó al servidor

    //-- vuelve la conexión: se sincroniza solo
    await context.unroute(RUTA_EMULADORES, cortarEmuladores);
    await context.setOffline(false);
    await page.reload();
    await expect.poll(gastosEnEmulador, { timeout: 40_000 }).toEqual(expect.arrayContaining(["Arriendo", "Mercado offline"]));
  });

  test("las rutas de React abren sin conexión (no solo la raíz)", async ({ page, context }) => {
    await registrarUsuario(page, correoUnico("rutas"));
    await esperarServiceWorker(page);
    await context.route(RUTA_EMULADORES, (r) => r.abort("internetdisconnected"));
    await context.setOffline(true);
    for (const [ruta, titulo] of [["/categorias", "Gastos por Categoria"], ["/lista", "Lista de Gastos"]]) {
      await page.goto(ruta);
      await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    }
    await context.setOffline(false);
  });
});
