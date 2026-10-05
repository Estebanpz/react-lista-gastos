//Integración del Worker con un Firestore real (emulador): consultas REST, índices y escrituras del `commit`.
//Solo corre con el emulador levantado (npm run test:emulador); con `npm test` se omite.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { ejecutar } from "../src/recordatorios.js";

const HOST = process.env.FIRESTORE_EMULATOR_HOST;
const PROYECTO = "demo-worker";
const BASE = `http://${HOST}`;
const DOCS = `${BASE}/v1/projects/${PROYECTO}/databases/(default)/documents`;
const omitir = !HOST && "requiere el emulador de Firestore (npm run test:emulador)";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = {
  GCP_PROJECT_ID: PROYECTO,
  FIRESTORE_BASE: BASE,
  GOOGLE_SA_JSON: JSON.stringify({ client_email: "emisor@demo", private_key_id: "k", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }),
};
const AHORA = new Date("2026-11-07T13:00:00Z"); //08:00 en Bogotá; un pago del 10 está a 3 días

const enviados = [];
//OAuth y FCM se simulan (no tienen emulador); Firestore va al emulador real con el token de administrador «owner»
const pedir = async (url, init) => {
  if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "owner" }));
  if (String(url).includes("fcm.googleapis.com")) {
    const { message } = JSON.parse(init.body);
    enviados.push(message);
    if (message.token === "token-muerto") return new Response(JSON.stringify({ error: { details: [{ errorCode: "UNREGISTERED" }] } }), { status: 404 });
    return new Response(JSON.stringify({ name: "ok" }));
  }
  return fetch(url, init);
};

const valor = (v) => (typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? { integerValue: String(v) } : v instanceof Date ? { timestampValue: v.toISOString() } : { stringValue: v });
const crear = async (ruta, datos) => {
  const [coleccion, id] = [ruta.slice(0, ruta.lastIndexOf("/")), ruta.slice(ruta.lastIndexOf("/") + 1)];
  const r = await fetch(`${DOCS}/${coleccion}?documentId=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, valor(v)])) }),
  });
  assert.ok(r.ok, `sembrar ${ruta}: ${r.status}`);
};
const leer = async (ruta) => {
  const r = await fetch(`${DOCS}/${ruta}`, { headers: { Authorization: "Bearer owner" } });
  return r.status === 404 ? null : r.json();
};

before(async () => {
  if (omitir) return;
  await fetch(`${BASE}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`, { method: "DELETE" });
  const pago = { descripcion: "Nómina", cantidad: 1500000, categoria: "nomina", frecuencia: "mensual", dia: 10, mes: 0, activo: true, uidUsuario: "ana" };
  await crear("recurrentes/r1", { ...pago, proximaFecha: "2026-11-10" });
  await crear("recurrentes/r2", { ...pago, proximaFecha: "2026-11-10", activo: false }); //pausado: no avisa
  await crear("recurrentes/r3", { ...pago, proximaFecha: "2026-12-10" }); //fuera de la ventana
  await crear("usuarios/ana", { zona: "America/Bogota", detalleEnAviso: false, actualizado: new Date("2026-11-01") });
  await crear("usuarios/ana/tokens/t1", { token: "token-bueno", plataforma: "android", actualizado: new Date("2026-11-01") });
  await crear("usuarios/ana/tokens/t2", { token: "token-muerto", plataforma: "escritorio", actualizado: new Date("2026-10-20") });
});

test("ciclo completo contra Firestore: avisa una vez, marca el pago y borra el token muerto", { skip: omitir }, async () => {
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.deepEqual([r.personas, r.avisos, r.enviados, r.tokensBorrados], [1, 1, 1, 1]);
  assert.deepEqual(enviados.map((m) => m.token).sort(), ["token-bueno", "token-muerto"]);
  assert.deepEqual(enviados[0].data, { tipo: "recordatorio", cantidad: "1", url: "/recurrentes" });

  assert.equal((await leer("recurrentes/r1")).fields.ultimoAviso.stringValue, "2026-11-10:antes");
  assert.equal((await leer("recurrentes/r2")).fields.ultimoAviso, undefined);
  assert.equal(await leer("usuarios/ana/tokens/t2"), null);
  assert.ok(await leer("usuarios/ana/tokens/t1"));
});

test("una segunda ejecución el mismo día no repite el aviso", { skip: omitir }, async () => {
  enviados.length = 0;
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.avisos, 0);
  assert.equal(enviados.length, 0);
});
