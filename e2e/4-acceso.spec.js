const { test, expect } = require("@playwright/test");
const { cerrarSesionUI, correoUnico, registrarUsuario, iniciarSesionUI, codigosDeRecuperacion, CLAVE } = require("./utilidades");

test.describe("Acceso en el móvil (táctil)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("el acceso es por invitación: no hay registro y /crear-cuenta lleva al inicio de sesión", async ({ page }) => {
    await page.goto("/crear-cuenta");
    await expect(page).toHaveURL(/\/inicio-sesion$/);
    await expect(page.getByRole("heading", { level: 2, name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByText(/el acceso es por invitación/i)).toBeVisible();
    await expect(page.getByText(/crear cuenta/i)).toHaveCount(0);
    await expect(page.getByLabel("Repetir contraseña")).toHaveCount(0);
  });

  test("en el iPhone ningún campo provoca zoom al enfocarlo (letra de al menos 16px)", async ({ page }) => {
    await page.goto("/inicio-sesion");
    const tamanos = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input:not([type=checkbox]), select, textarea")).map((el) => parseFloat(getComputedStyle(el).fontSize))
    );
    expect(tamanos.length).toBeGreaterThan(1);
    expect(Math.min(...tamanos)).toBeGreaterThanOrEqual(16);
  });

  test("al enfocar un campo la cabecera se contrae para dejar espacio al teclado", async ({ page }) => {
    await page.goto("/inicio-sesion");
    const titular = page.getByRole("heading", { level: 1 });
    await expect(titular).toBeVisible();
    await page.getByLabel("Correo electrónico").first().tap();
    await expect(page.getByRole("button", { name: "Mostrar la cabecera" })).toBeVisible();
    await expect(titular).not.toBeInViewport(); //la cabecera se contrajo (queda recortada a altura 0)
  });

  test("un error de validación vibra, enfoca el primer campo y dice qué corregir", async ({ page }) => {
    await page.addInitScript(() => {
      window.__vibraciones = [];
      navigator.vibrate = (p) => { window.__vibraciones.push(p); return true; };
    });
    await page.goto("/inicio-sesion");
    const panel = page.getByRole("main");
    await panel.getByRole("button", { name: /^iniciar sesión/i }).tap();
    await expect(panel.getByText("Escribe tu correo electrónico.")).toBeVisible();
    await expect(panel.getByLabel("Correo electrónico")).toBeFocused();
    expect(await page.evaluate(() => window.__vibraciones.length)).toBeGreaterThan(0);
  });
});

test.describe("Acceso: movimiento reducido", () => {
  test("con «reducir movimiento» la hoja de acceso no se anima", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/inicio-sesion");
    const animacion = await page.evaluate(() => getComputedStyle(document.querySelector("main section")).animationName);
    expect(animacion).toBe("none");
  });
});

test.describe("Acceso: Recordarme y sesión", () => {
  test("con «Recordarme» la sesión sobrevive a una pestaña nueva; sin él, solo vive en su pestaña", async ({ page, context }) => {
    const correo = correoUnico("recordar");
    await registrarUsuario(page, correo); //se registra recordando
    const otra = await context.newPage();
    await otra.goto("/");
    await expect(otra.getByRole("heading", { name: "Hola, así van tus gastos" })).toBeVisible(); //sigue con sesión
    await otra.close();

    await cerrarSesionUI(page);

    await iniciarSesionUI(page, correo, false); //ahora SIN recordar
    const nueva = await context.newPage();
    await nueva.goto("/");
    await expect(nueva.getByRole("heading", { level: 2, name: "Iniciar sesión" })).toBeVisible(); //no hay sesión en la pestaña nueva
    await nueva.close();
    await expect(page.getByRole("heading", { name: "Hola, así van tus gastos" })).toBeVisible(); //la original sigue
  });

  test("una contraseña incorrecta muestra un mensaje que no revela si el correo existe", async ({ page }) => {
    const correo = correoUnico("clave");
    await registrarUsuario(page, correo);
    await cerrarSesionUI(page);

    const panel = page.getByRole("main");
    await panel.getByLabel("Correo electrónico").fill(correo);
    await panel.getByLabel("Contraseña", { exact: true }).fill("otra-clave-mala");
    await panel.getByRole("button", { name: /^iniciar sesión/i }).click();
    await expect(panel.getByRole("alert")).toContainText(/correo o contraseña incorrectos/i);
    await expect(panel.getByRole("button", { name: /^iniciar sesión/i })).toBeEnabled();
  });
});

test.describe("Acceso: recuperar contraseña", () => {
  test("envía el correo de recuperación y responde igual para un correo que no existe", async ({ page, context }) => {
    const existente = correoUnico("existe");
    await registrarUsuario(page, existente);
    await cerrarSesionUI(page);

    //Cada solicitud va en una página nueva: así no choca con la recarga que hace «Cerrar sesión»
    const pedir = async (correo) => {
      const nueva = await context.newPage();
      await nueva.goto("/inicio-sesion");
      const panel = nueva.getByRole("main");
      await panel.getByLabel("Correo electrónico").fill(correo);
      await panel.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
      await panel.getByRole("button", { name: "Enviar enlace" }).click();
      await expect(panel.getByRole("status")).toContainText(/si ese correo tiene una cuenta/i);
      await nueva.close();
    };

    await pedir(existente);
    const inexistente = correoUnico("nadie");
    await pedir(inexistente);

    const enviados = await codigosDeRecuperacion();
    expect(enviados).toContain(existente); //el correo real sí recibió el enlace
    expect(enviados).not.toContain(inexistente); //el inexistente no, pero la pantalla no lo reveló
  });

  test("el enlace «Volver a iniciar sesión» regresa al formulario con el foco usable", async ({ page }) => {
    await page.goto("/inicio-sesion");
    const panel = page.getByRole("main");
    await panel.getByRole("button", { name: "¿Olvidaste tu contraseña?" }).click();
    await panel.getByRole("button", { name: /volver a iniciar sesión/i }).click();
    await expect(panel.getByLabel("Contraseña", { exact: true })).toBeVisible();
    expect(CLAVE.length).toBeGreaterThan(5);
  });
});
