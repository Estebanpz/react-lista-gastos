const { expect } = require("@playwright/test");
const puertos = require("../scripts/puertos-e2e");

const CLAVE = "clave-segura-123";

//Cada prueba usa un correo distinto para no depender de las demás
const correoUnico = (prefijo) => `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@prueba.test`;

//No hay registro en la app (acceso por invitación): la cuenta se crea en el emulador de Auth, igual que el
//administrador la crea en la consola de Firebase, y luego se entra por la pantalla real de inicio de sesión
const crearCuenta = async (correo, plan = {}) => {
  const respuesta = await fetch(
    `http://127.0.0.1:${puertos.auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=api-key-falsa-e2e`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: correo, password: CLAVE, returnSecureToken: true }) }
  );
  if (!respuesta.ok) throw new Error(`No se pudo crear la cuenta de prueba (${respuesta.status})`);
  const { localId } = await respuesta.json();
  //Sin documento de plan las reglas no dejan registrar nada: el administrador lo crea al dar de alta a la persona
  if (plan !== null) await asignarPlan(localId, correo, plan);
  return localId;
};


//Escribe clientes/{uid} (y, si se pide, super_admins/{uid}) en el emulador con acceso de propietario (se salta las reglas).
//Por defecto: plan Negocio activo y vigente. `diasVence` negativo = ya vencido.
const asignarPlan = async (uid, correo, { plan = "negocio", estado = "activo", diasVence = 400, limites, admin = false } = {}) => {
  //Límites del catálogo real de la app (así las pruebas no se desfasan cuando cambian los paquetes)
  const { PLANES } = await import("../src/functions/planes.js");
  limites = limites || PLANES[plan].limites;
  const base = `http://127.0.0.1:${puertos.firestore}/v1/projects/demo-e2e/databases/(default)/documents`;
  const escribir = async (ruta, campos) => {
    const r = await fetch(`${base}/${ruta}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields: campos }) });
    if (!r.ok) throw new Error(`No se pudo sembrar ${ruta} (${r.status})`);
  };
  const ahora = new Date().toISOString();
  await escribir(`clientes/${uid}`, {
    correo: { stringValue: correo },
    plan: { stringValue: plan },
    estado: { stringValue: estado },
    vence: { timestampValue: new Date(Date.now() + diasVence * 86400000).toISOString() },
    limites: { mapValue: { fields: Object.fromEntries(Object.entries(limites).map(([k, v]) => [k, { integerValue: String(v) }])) } },
    creado: { timestampValue: ahora },
    actualizado: { timestampValue: ahora },
  });
  if (admin) await escribir(`super_admins/${uid}`, { correo: { stringValue: correo } });
};

//Crea la cuenta y entra; espera la pantalla de inicio
const registrarUsuario = async (page, correo, plan) => {
  const uid = await crearCuenta(correo, plan);
  await iniciarSesionUI(page, correo);
  return uid;
};

//Escribe un documento en el emulador (acceso de propietario, se salta las reglas). Tipos JS → tipos de Firestore.
const valorFs = (v) => (typeof v === "boolean" ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : typeof v === "number" ? { doubleValue: v } : v instanceof Date ? { timestampValue: v.toISOString() } : { stringValue: String(v) });
const sembrarDocumento = async (ruta, objeto) => {
  const url = `http://127.0.0.1:${puertos.firestore}/v1/projects/demo-e2e/databases/(default)/documents/${ruta}`;
  const r = await fetch(url, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(objeto).map(([k, v]) => [k, valorFs(v)])) }) });
  if (!r.ok) throw new Error(`No se pudo sembrar ${ruta} (${r.status})`);
};

//Inicia sesión desde la pantalla de acceso; «recordar» = estado del interruptor «Recordarme»
const iniciarSesionUI = async (page, correo, recordar = true) => {
  await page.goto("/inicio-sesion");
  const panel = page.getByRole("main");
  await panel.getByLabel("Correo electrónico").fill(correo);
  await panel.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  const interruptor = panel.getByRole("switch", { name: "Recordarme" });
  if ((await interruptor.isChecked()) !== recordar) await interruptor.setChecked(recordar, { force: true });
  await panel.getByRole("button", { name: /^iniciar sesión/i }).click();
  //Un cliente cae en Inicio; el super admin, en su panel
  await expect(page.getByRole("heading", { name: /^(Hola, así van tus gastos|Clientes)$/ })).toBeVisible();
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

module.exports = { sembrarDocumento, crearCuenta, asignarPlan, cerrarSesionUI, irA, documentosEnEmulador, RUTA_EMULADORES, CLAVE, correoUnico, registrarUsuario, iniciarSesionUI, deslizar, codigosDeRecuperacion, enviarGasto, elegirFecha, esperarServiceWorker, gastosEnEmulador };
