const { test, expect } = require("@playwright/test");
const { correoUnico, crearCuenta, registrarUsuario, documentosEnEmulador } = require("./utilidades");

test.describe("Panel de super admin", () => {
  test("una persona sin permiso de admin no ve el enlace y /admin la devuelve al inicio", async ({ page }) => {
    await registrarUsuario(page, correoUnico("normal"));
    await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Clientes" })).toHaveCount(0);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Hola, así van tus gastos" })).toBeVisible();
  });

  test("lista clientes con su estado, registra un pago y suspende", async ({ page }) => {
    const correoCliente = correoUnico("cliente");
    await crearCuenta(correoCliente, { plan: "basico", diasVence: -4 }); //vencido
    await crearCuenta(correoUnico("otro"), { plan: "plus", diasVence: 20 });
    await registrarUsuario(page, correoUnico("admin"), { admin: true });

    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Clientes" }).click();
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    await expect(page.getByText(/Vencido hace 4 días/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Vencidos/ })).toBeVisible();

    //Filtra por correo y abre el detalle
    await page.getByLabel("Buscar cliente por correo o nombre").fill(correoCliente);
    await page.getByRole("button", { name: correoCliente }).click();
    const detalle = page.getByRole("dialog");
    await expect(detalle.getByText("Todavía no hay pagos.")).toBeVisible();

    //Registra un pago: vuelve a estar activo y queda el asiento
    await detalle.getByRole("button", { name: "Registrar pago" }).click();
    const hoja = page.getByRole("dialog", { name: "Registrar pago" });
    await hoja.getByLabel("Referencia (opcional)").fill("Nequi 123");
    await hoja.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByRole("dialog", { name: "Registrar pago" })).toHaveCount(0);
    await expect(page.getByText("Activo").first()).toBeVisible();
    const pagos = await documentosEnEmulador("pagosPlan");
    expect(pagos.find((p) => p.correo === correoCliente)).toMatchObject({ plan: "basico", referencia: "Nequi 123" });

    //Suspende
    await page.getByRole("dialog").getByRole("button", { name: "Suspender" }).click();
    await expect(page.getByText("Suspendido").first()).toBeVisible();
  });

  test("Nuevo cliente: pide al servidor crear la cuenta y el plan, y muestra el enlace para compartir", async ({ page }) => {
    const correoCliente = correoUnico("nuevo");
    await crearCuenta(correoCliente, null); //el servidor real crearía la cuenta; aquí se simula con el emulador de Auth
    await registrarUsuario(page, correoUnico("admin2"), { admin: true });
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Clientes" }).click();

    let pedido;
    await page.route("**/clientes", async (ruta) => {
      const r = ruta.request();
      if (r.method() === "OPTIONS") return ruta.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST" } });
      pedido = { cabeceras: r.headers(), cuerpo: r.postDataJSON() };
      return ruta.fulfill({ status: 201, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ uid: "uidNuevo", enlace: "https://x.test/reset?oobCode=abc" }) });
    });

    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    const hoja = page.getByRole("dialog", { name: "Nuevo cliente" });
    await hoja.getByLabel("Correo").fill(correoCliente);
    await hoja.getByLabel("Nombre (opcional)").fill("Cliente Nuevo");
    await hoja.getByLabel("Plan").selectOption("plus");
    await hoja.getByRole("button", { name: "Crear cliente" }).click();

    const listo = page.getByRole("dialog", { name: "Cliente creado" });
    await expect(listo.getByText(/Le enviamos un correo/)).toBeVisible();
    await expect(listo.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveAttribute("href", /wa\.me\/\?text=.*oobCode%3Dabc/);
    expect(pedido.cuerpo).toMatchObject({ correo: correoCliente, nombre: "Cliente Nuevo", plan: "plus" });
    expect(pedido.cabeceras.authorization).toMatch(/^Bearer ey/); //ID token de la sesión del admin
  });

  test("el super admin entra directo a su panel, sin las pantallas de cliente, y recargar no lo saca", async ({ page }) => {
    await registrarUsuario(page, correoUnico("soloadmin"), { admin: true });
    await expect(page).toHaveURL(/\/admin$/);
    const menu = page.getByRole("navigation", { name: "Principal" });
    await expect(menu.getByRole("link", { name: "Clientes" })).toBeVisible();
    for (const n of ["Inicio", "Gastos variables", "Categorías", "Gastos fijos", "Mi plan"]) await expect(menu.getByRole("link", { name: n })).toHaveCount(0);

    await page.reload(); //el plan y «es admin» se resuelven por separado: no debe redirigir antes de saberlo
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
    for (const ruta of ["/", "/lista", "/plan"]) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/admin$/);
    }
  });

  test("«Cambiar plan o editar» permite fijar cupos a medida (gastos, gastos fijos, categorías y dispositivos)", async ({ page }) => {
    const correo = correoUnico("negociado");
    const uidCliente = await crearCuenta(correo, { plan: "basico", diasVence: 20 });
    await registrarUsuario(page, correoUnico("admin3"), { admin: true });
    await page.getByLabel("Buscar cliente por correo o nombre").fill(correo);
    await page.getByRole("button", { name: correo }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cambiar plan o editar" }).click();
    const hoja = page.getByRole("dialog", { name: "Cambiar plan" });
    await expect(hoja.getByLabel("Gastos variables (gastos)")).toHaveAttribute("placeholder", "Plan: 30");
    await expect(hoja.getByLabel("Gastos fijos (pagos)")).toHaveAttribute("placeholder", "Plan: 5");
    await hoja.getByLabel("Gastos variables (gastos)").fill("45");
    await hoja.getByLabel("Gastos fijos (pagos)").fill("12");
    await hoja.getByLabel("Categorías propias").fill("6");
    await hoja.getByLabel("Dispositivos con avisos").fill("3");
    await hoja.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(hoja).toBeHidden();

    const doc = await (await fetch(`http://127.0.0.1:${require("../scripts/puertos-e2e").firestore}/v1/projects/demo-e2e/databases/(default)/documents/clientes/${uidCliente}`, { headers: { Authorization: "Bearer owner" } })).json();
    const l = Object.fromEntries(Object.entries(doc.fields.limites.mapValue.fields).map(([k, v]) => [k, Number(v.integerValue)]));
    expect(l).toEqual({ gastosMes: 45, pagosActivos: 12, categorias: 6, dispositivos: 3 });

    //al volver a abrir (el detalle del cliente sigue detrás), los cupos a medida aparecen llenos
    await page.getByRole("dialog").getByRole("button", { name: "Cambiar plan o editar" }).click();
    await expect(page.getByRole("dialog", { name: "Cambiar plan" }).getByLabel("Gastos fijos (pagos)")).toHaveValue("12");
  });
});
