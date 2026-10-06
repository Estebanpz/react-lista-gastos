import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createSign } from "node:crypto";
import { verificarIdToken } from "../src/token.js";
import { manejarSolicitud, validarNuevoCliente } from "../src/api.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const SA = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
const JWK = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" };
const env = { GCP_PROJECT_ID: "demo", GOOGLE_SA_JSON: JSON.stringify({ client_email: "e@demo.iam.gserviceaccount.com", private_key_id: "k", private_key: SA.export({ type: "pkcs8", format: "pem" }) }) };
const AHORA = new Date("2026-11-07T15:00:00Z");
const SEG = Math.floor(AHORA.getTime() / 1000);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const firmar = (carga = {}, cab = {}) => {
  const c = { alg: "RS256", typ: "JWT", kid: "k1", ...cab };
  const p = { aud: "demo", iss: "https://securetoken.google.com/demo", sub: "admin1", iat: SEG - 10, exp: SEG + 3000, email: "yo@prueba.test", ...carga };
  const datos = `${b64(c)}.${b64(p)}`;
  return `${datos}.${createSign("RSA-SHA256").update(datos).sign(privateKey).toString("base64url")}`;
};

//Google falso: claves públicas, OAuth, Firestore (super_admins, commit) e Identity Toolkit
const servidor = ({ esAdmin = true, correoExiste = false, oob = true } = {}) => {
  const llamadas = [];
  const pedir = async (url, init = {}) => {
    const u = String(url);
    const cuerpo = init.body && typeof init.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : init.body;
    llamadas.push({ url: u, cuerpo, init });
    const json = (o, status = 200) => ({ ok: status < 300, status, json: async () => o });
    if (u.includes("service_accounts/v1/jwk")) return json({ keys: [JWK] });
    if (u.includes("oauth2")) return json({ access_token: "AT" });
    if (u.includes("/super_admins/")) return esAdmin ? json({}) : json({}, 404);
    if (u.endsWith(":commit")) return json({});
    if (u.endsWith("/accounts")) return correoExiste ? json({ error: { message: "EMAIL_EXISTS" } }, 400) : json({ localId: "nuevoUid" });
    if (u.endsWith("accounts:sendOobCode")) return oob ? json({ oobLink: "https://x/reset?oobCode=abc" }) : json({}, 500);
    throw new Error(`URL inesperada ${u}`);
  };
  return { pedir, llamadas };
};
const solicitud = (cuerpo, { token = firmar(), origen = "https://finanzas.zfmanager.com", metodo = "POST", ruta = "/clientes" } = {}) =>
  new Request(`https://api.test${ruta}`, { method: metodo, headers: { Origin: origen, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: metodo === "POST" ? JSON.stringify(cuerpo) : undefined });
const VALIDO = { correo: "Ana@Prueba.test ", plan: "basico", nombre: "Ana", notas: "Nequi" };

test("verificarIdToken acepta un token bien firmado y rechaza los demás casos", async () => {
  const { pedir } = servidor();
  assert.deepEqual(await verificarIdToken(firmar(), env, pedir, SEG), { uid: "admin1", correo: "yo@prueba.test" });
  const casos = [
    ["firma de otra clave", firmar().slice(0, -4) + "AAAA", "token-firma"],
    ["proyecto distinto", firmar({ aud: "otro" }), "token-proyecto"],
    ["emisor distinto", firmar({ iss: "https://malo" }), "token-proyecto"],
    ["caducado", firmar({ exp: SEG - 1 }), "token-caducado"],
    ["sin sujeto", firmar({ sub: "" }), "token-sin-sujeto"],
    ["algoritmo none", firmar({}, { alg: "none" }), "token-algoritmo"],
    ["kid desconocido", firmar({}, { kid: "zzz" }), "token-clave-desconocida"],
    ["basura", "no.es.token", "token-malformado"],
  ];
  for (const [nombre, token, mensaje] of casos) await assert.rejects(verificarIdToken(token, env, pedir, SEG), (e) => e.message === mensaje, nombre);
});

test("validarNuevoCliente normaliza el correo y rechaza datos inválidos", () => {
  assert.deepEqual(validarNuevoCliente(VALIDO).datos, { correo: "ana@prueba.test", plan: "basico", nombre: "Ana", notas: "Nequi" });
  assert.equal(validarNuevoCliente({ ...VALIDO, correo: "sin-arroba" }).error, "correo-invalido");
  assert.equal(validarNuevoCliente({ ...VALIDO, plan: "gratis" }).error, "plan-invalido");
  assert.equal(validarNuevoCliente({ ...VALIDO, nombre: "x".repeat(61) }).error, "texto-muy-largo");
  assert.equal(validarNuevoCliente(null).error, "correo-invalido");
});

test("super admin crea un cliente: cuenta + plan con el formato de las reglas + enlace", async () => {
  const { pedir, llamadas } = servidor();
  const r = await manejarSolicitud(solicitud(VALIDO), env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { uid: "nuevoUid", enlace: "https://x/reset?oobCode=abc" });
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://finanzas.zfmanager.com");
  const cuenta = llamadas.find((l) => l.url.endsWith("/accounts")).cuerpo;
  assert.equal(cuenta.email, "ana@prueba.test");
  assert.ok(cuenta.password.length >= 20); //aleatoria, nunca la ve nadie
  const w = llamadas.find((l) => l.url.endsWith(":commit")).cuerpo.writes[0];
  assert.ok(w.update.name.endsWith("/clientes/nuevoUid"));
  assert.deepEqual(w.currentDocument, { exists: false });
  const f = w.update.fields;
  assert.equal(f.plan.stringValue, "basico");
  assert.equal(f.estado.stringValue, "activo");
  assert.equal(f.limites.mapValue.fields.gastosMes.integerValue, "30");
  assert.equal(f.vence.timestampValue, "2026-12-08T04:59:59.999Z"); //30 días, al cierre del día en Colombia
  assert.deepEqual(Object.keys(f).sort(), ["actualizado", "correo", "creado", "estado", "limites", "nombre", "notas", "plan", "vence"]);
});

test("el plan de prueba nace en estado «prueba»", async () => {
  const { pedir, llamadas } = servidor();
  await manejarSolicitud(solicitud({ correo: "b@prueba.test", plan: "prueba" }), env, { fetch: pedir, ahora: AHORA });
  assert.equal(llamadas.find((l) => l.url.endsWith(":commit")).cuerpo.writes[0].update.fields.estado.stringValue, "prueba");
});

test("quien no es super admin recibe 403 y no se crea nada", async () => {
  const { pedir, llamadas } = servidor({ esAdmin: false });
  const r = await manejarSolicitud(solicitud(VALIDO), env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.status, 403);
  assert.equal(llamadas.filter((l) => l.url.endsWith("/accounts") || l.url.endsWith(":commit")).length, 0);
});

test("sin token válido recibe 401 (sin consultar Firestore)", async () => {
  const { pedir, llamadas } = servidor();
  const r = await manejarSolicitud(solicitud(VALIDO, { token: "x.y.z" }), env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.status, 401);
  assert.equal(llamadas.filter((l) => l.url.includes("firestore") || l.url.includes("oauth2")).length, 0);
});

test("correo ya registrado → 409 y no escribe el plan", async () => {
  const { pedir, llamadas } = servidor({ correoExiste: true });
  const r = await manejarSolicitud(solicitud(VALIDO), env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.status, 409);
  assert.equal(llamadas.filter((l) => l.url.endsWith(":commit")).length, 0);
});

test("si no se pudo generar el enlace igual crea al cliente (enlace null)", async () => {
  const { pedir } = servidor({ oob: false });
  const r = await manejarSolicitud(solicitud(VALIDO), env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.status, 201);
  assert.equal((await r.json()).enlace, null);
});

test("CORS: preflight de un origen permitido, y un origen ajeno no recibe permiso", async () => {
  const { pedir } = servidor();
  const pre = await manejarSolicitud(solicitud(null, { metodo: "OPTIONS" }), env, { fetch: pedir, ahora: AHORA });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("Access-Control-Allow-Origin"), "https://finanzas.zfmanager.com");
  const vista = await manejarSolicitud(solicitud(null, { metodo: "OPTIONS", origen: "https://demo--rediseno-ab12.web.app" }), env, { fetch: pedir, ahora: AHORA });
  assert.equal(vista.headers.get("Access-Control-Allow-Origin"), "https://demo--rediseno-ab12.web.app");
  const ajeno = await manejarSolicitud(solicitud(VALIDO, { origen: "https://malo.example" }), env, { fetch: pedir, ahora: AHORA });
  assert.equal(ajeno.headers.get("Access-Control-Allow-Origin"), null);
});

test("otras rutas y métodos → 404", async () => {
  const { pedir } = servidor();
  assert.equal((await manejarSolicitud(solicitud(VALIDO, { ruta: "/otra" }), env, { fetch: pedir, ahora: AHORA })).status, 404);
  assert.equal((await manejarSolicitud(solicitud(null, { metodo: "GET" }), env, { fetch: pedir, ahora: AHORA })).status, 404);
});
