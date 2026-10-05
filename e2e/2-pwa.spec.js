const { test, expect } = require("@playwright/test");
const { esperarServiceWorker, RUTA_EMULADORES } = require("./utilidades");

test.describe("PWA: instalabilidad y service worker", () => {
  test("Chrome considera la app instalable y el manifest no tiene errores", async ({ page }) => {
    await page.goto("/inicio-sesion");
    await esperarServiceWorker(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Page.enable");
    const manifest = await cdp.send("Page.getAppManifest");
    expect(manifest.errors, JSON.stringify(manifest.errors)).toEqual([]);

    //Playwright abre contextos aislados y Chrome lo reporta como «in-incognito»: es un
    //efecto de la prueba, no de la app. Cualquier OTRO error de instalabilidad sí debe fallar.
    const instalabilidad = await cdp.send("Page.getInstallabilityErrors");
    const reales = instalabilidad.installabilityErrors.filter((e) => e.errorId !== "in-incognito");
    expect(reales, JSON.stringify(reales)).toEqual([]);
  });

  test("el service worker queda activo, controla la página y precachea la app", async ({ page }) => {
    await page.goto("/inicio-sesion");
    await esperarServiceWorker(page);

    const info = await page.evaluate(async () => {
      const claves = await caches.keys();
      const precache = claves.find((k) => k.includes("precache"));
      const entradas = precache ? (await (await caches.open(precache)).keys()).map((r) => new URL(r.url).pathname) : [];
      return { claves, entradas };
    });
    expect(info.entradas).toContain("/index.html");
    expect(info.entradas.some((u) => /\/static\/js\/main\.[0-9a-f]+\.js$/.test(u))).toBe(true);
    //las capturas del manifest no deben precachearse
    expect(info.entradas.some((u) => u.includes("captura-"))).toBe(false);
  });

  test("el service worker NO intercepta ni cachea Firestore ni Auth", async ({ page }) => {
    await page.goto("/inicio-sesion");
    await esperarServiceWorker(page);
    const cacheadas = await page.evaluate(async () => {
      const urls = [];
      for (const nombre of await caches.keys()) {
        for (const r of await (await caches.open(nombre)).keys()) urls.push(r.url);
      }
      return urls;
    });
    expect(cacheadas.filter((u) => /firestore|identitytoolkit|securetoken/.test(u) || RUTA_EMULADORES.test(u))).toEqual([]);
  });

  test("el manifest declara los datos esperados", async ({ request }) => {
    const m = await (await request.get("/manifest.json")).json();
    expect(m).toMatchObject({ display: "standalone", start_url: "/", scope: "/", lang: "es-CO", theme_color: "#F9F9F9" });
    expect(m.icons.some((i) => i.purpose === "maskable")).toBe(true);
    expect(m.screenshots.map((s) => s.form_factor).sort()).toEqual(["narrow", "wide"]);
  });
});
