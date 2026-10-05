const { test, expect } = require("@playwright/test");

//Solo rutas públicas (sin iniciar sesión). Comprueba lo que realmente envía Hosting.
test.describe("Seguridad: cabeceras y CSP", () => {
  test("las páginas no generan ninguna violación de la política CSP", async ({ page }) => {
    await page.addInitScript(() => {
      window.__violaciones = [];
      document.addEventListener("securitypolicyviolation", (e) =>
        window.__violaciones.push(`${e.violatedDirective} -> ${e.blockedURI}`)
      );
    });
    const erroresConsola = [];
    page.on("console", (m) => {
      if (m.type() === "error" && /content security policy/i.test(m.text())) erroresConsola.push(m.text());
    });

    for (const ruta of ["/inicio-sesion", "/crear-cuenta", "/ruta-que-no-existe"]) {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => window.__violaciones)).toEqual([]);
    }
    expect(erroresConsola).toEqual([]);
  });

  test("la CSP, el anti-clickjacking y nosniff llegan en las respuestas", async ({ request }) => {
    for (const ruta of ["/", "/lista", "/service-worker.js", "/manifest.json"]) {
      const r = await request.get(ruta);
      const h = r.headers();
      expect(h["content-security-policy"], ruta).toContain("script-src 'self'");
      expect(h["content-security-policy"], ruta).toContain("object-src 'none'");
      expect(h["content-security-policy"], ruta).toContain("frame-ancestors 'none'");
      expect(h["x-content-type-options"], ruta).toBe("nosniff");
      expect(h["x-frame-options"], ruta).toBe("DENY");
      expect(h["referrer-policy"], ruta).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"], ruta).toContain("camera=()");
    }
  });

  test("el service worker, el manifest y las rutas de página no se cachean", async ({ request }) => {
    for (const ruta of ["/service-worker.js", "/manifest.json", "/", "/lista", "/categorias"]) {
      const r = await request.get(ruta);
      expect(r.headers()["cache-control"], ruta).toBe("no-cache");
    }
  });

  test("los archivos con hash son inmutables y no hay scripts inline ni source maps", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html, "no debe haber <script> inline").not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);

    const principal = html.match(/\/static\/js\/main\.[0-9a-f]+\.js/)[0];
    const respuesta = await request.get(principal);
    expect(respuesta.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(await respuesta.text()).not.toContain("sourceMappingURL");
  });

  test("los iconos del manifest existen y son imágenes", async ({ request }) => {
    const manifest = await (await request.get("/manifest.json")).json();
    for (const icono of manifest.icons) {
      const r = await request.get(icono.src);
      expect(r.status(), icono.src).toBe(200);
      expect(r.headers()["content-type"], icono.src).toContain("image/png");
    }
  });
});
