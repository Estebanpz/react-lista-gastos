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
  //Enter envía el formulario (en el móvil el botón se mueve mientras la cabecera se contrae al enfocar)
  await panel.getByLabel("Repetir contraseña").press("Enter");
  await expect(page.getByRole("heading", { name: "Hola, así van tus gastos" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Hola, así van tus gastos" })).toBeVisible();
};

//Cierra sesión y espera la recarga completa que borra los datos locales
//(la ruta cambia antes de esa recarga; navegar justo en medio aborta la navegación)
const cerrarSesionUI = async (page) => {
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Cerrar sesión" }).click()]);
  await page.waitForURL("**/inicio-sesion");
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

//Llena el registro rápido de Inicio (escritorio) y lo envía; devuelve sin esperar la confirmación
const enviarGasto = async (page, descripcion, cantidad, categoria) => {
  await page.getByLabel("Valor del gasto (COP)").fill(String(cantidad));
  if (categoria) await page.getByRole("radio", { name: categoria }).click();
  await page.getByLabel("Detalle").fill(descripcion);
  await page.getByRole("button", { name: /^guardar gasto/i }).click();
};

//Cambia la fecha del gasto con el calendario (dia: 1–31; mes: 1–12). Usa los selectores de mes y año del calendario.
const elegirFecha = async (page, anio, mes, dia) => {
  await page.getByRole("button", { name: /^Fecha del gasto/ }).click();
  const hoja = page.getByRole("dialog", { name: "Fecha del gasto" });
  await hoja.getByLabel("Año").selectOption(String(anio));
  await hoja.getByLabel("Mes", { exact: true }).selectOption(String(mes - 1));
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  await hoja.getByRole("gridcell", { name: `${dia} de ${meses[mes - 1]} de ${anio}` }).click();
  await hoja.waitFor({ state: "hidden" });
};

//Va a una sección con la navegación principal (barra lateral en escritorio)
const irA = async (page, nombre) => {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: nombre }).click();
};

//Espera a que el service worker esté activo y controlando esta página
const esperarServiceWorker = async (page) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
};

//Documentos de una colección según el emulador de Firestore (lectura de administrador)
const documentosEnEmulador = async (coleccion) => {
  const respuesta = await fetch(
    `http://127.0.0.1:${puertos.firestore}/v1/projects/demo-e2e/databases/(default)/documents/${coleccion}`,
    { headers: { Authorization: "Bearer owner" } }
  );
  const json = await respuesta.json();
  return (json.documents || []).map((d) => ({ id: d.name.split("/").pop(), ...Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.stringValue ?? v.integerValue ?? v.doubleValue])) }));
};

const gastosEnEmulador = async () => (await documentosEnEmulador("gastos")).map((d) => d.descripcion);

//Para cortar la comunicación con los emuladores y simular que no hay red
const RUTA_EMULADORES = new RegExp(`127\\.0\\.0\\.1:(${puertos.firestore}|${puertos.auth})`);

module.exports = { cerrarSesionUI, irA, documentosEnEmulador, RUTA_EMULADORES, CLAVE, correoUnico, registrarUsuario, iniciarSesionUI, deslizar, codigosDeRecuperacion, enviarGasto, elegirFecha, esperarServiceWorker, gastosEnEmulador };
