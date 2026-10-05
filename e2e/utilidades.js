const { expect } = require("@playwright/test");
const puertos = require("../scripts/puertos-e2e");

const CLAVE = "clave-segura-123";

//Cada prueba usa un correo distinto para no depender de las demás
const correoUnico = (prefijo) => `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@prueba.test`;

//Crea la cuenta desde la pantalla real (contra el emulador de Auth) y espera la pantalla de inicio
const registrarUsuario = async (page, correo) => {
  await page.goto("/crear-cuenta");
  const panel = page.getByRole("tabpanel", { name: "Crear cuenta" });
  await panel.getByLabel("Correo electrónico").fill(correo);
  await panel.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  await panel.getByLabel("Repetir contraseña").fill(CLAVE);
  await panel.getByRole("button", { name: /^crear cuenta/i }).click();
  await expect(page.getByRole("heading", { name: "Agregar Gasto" })).toBeVisible();
};

//Inicia sesión desde la pantalla de acceso; «recordar» = estado del interruptor «Recordarme»
const iniciarSesionUI = async (page, correo, recordar = true) => {
  await page.goto("/inicio-sesion");
  const panel = page.getByRole("tabpanel", { name: "Iniciar sesión" });
  await panel.getByLabel("Correo electrónico").fill(correo);
  await panel.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  const interruptor = panel.getByRole("switch", { name: "Recordarme" });
  if ((await interruptor.isChecked()) !== recordar) await interruptor.setChecked(recordar, { force: true });
  await panel.getByRole("button", { name: /^iniciar sesión/i }).click();
  await expect(page.getByRole("heading", { name: "Agregar Gasto" })).toBeVisible();
};

//Desliza el dedo en horizontal con eventos táctiles reales (CDP)
const deslizar = async (page, desdeX, hastaX, y, { pasos = 8, pausaMs = 12 } = {}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: desdeX, y }] });
  for (let i = 1; i <= pasos; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: desdeX + ((hastaX - desdeX) * i) / pasos, y }] });
    await page.waitForTimeout(pausaMs);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
};

//Códigos de recuperación de contraseña que generó el emulador de Auth
const codigosDeRecuperacion = async () => {
  const r = await fetch(`http://127.0.0.1:${puertos.auth}/emulator/v1/projects/demo-e2e/oobCodes`);
  const j = await r.json();
  return (j.oobCodes || []).filter((c) => c.requestType === "PASSWORD_RESET").map((c) => c.email);
};

//Llena el formulario y lo envía; devuelve sin esperar el mensaje (cada prueba lo comprueba)
const enviarGasto = async (page, descripcion, cantidad) => {
  await page.getByLabel("Descripción del gasto").fill(descripcion);
  await page.getByLabel("Cantidad gastada").fill(String(cantidad));
  await page.getByRole("button", { name: /^agregar gasto/i }).click();
};

//Espera a que el service worker esté activo y controlando esta página
const esperarServiceWorker = async (page) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
};

//Documentos de la colección «gastos» según el emulador de Firestore (lectura de administrador)
const gastosEnEmulador = async () => {
  const respuesta = await fetch(
    `http://127.0.0.1:${puertos.firestore}/v1/projects/demo-e2e/databases/(default)/documents/gastos`,
    { headers: { Authorization: "Bearer owner" } }
  );
  const json = await respuesta.json();
  return (json.documents || []).map((d) => d.fields.descripcion.stringValue);
};

//Para cortar la comunicación con los emuladores y simular que no hay red
const RUTA_EMULADORES = new RegExp(`127\\.0\\.0\\.1:(${puertos.firestore}|${puertos.auth})`);

module.exports = { RUTA_EMULADORES, CLAVE, correoUnico, registrarUsuario, iniciarSesionUI, deslizar, codigosDeRecuperacion, enviarGasto, esperarServiceWorker, gastosEnEmulador };
