import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { firmarJWT } from "../src/google.js";
import { ejecutar, MAX_ENVIOS, MAX_SMS } from "../src/recordatorios.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const SA = {
  client_email: "emisor@demo.iam.gserviceaccount.com",
  private_key_id: "kid1",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
};
const env = { GCP_PROJECT_ID: "demo", GOOGLE_SA_JSON: JSON.stringify(SA) };
const AHORA = new Date("2026-11-07T13:00:00Z"); //08:00 en Bogotá

const campos = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? { integerValue: String(v) } : { stringValue: v }]));
const docRec = (id, uid, extra = {}) => ({ document: { name: `projects/demo/databases/(default)/documents/recurrentes/${id}`, fields: campos({ descripcion: `Pago ${id}`, uidUsuario: uid, proximaFecha: "2026-11-10", activo: true, ...extra }) } });
const docTok = (uid, id, extra = {}) => ({ document: { name: `projects/demo/databases/(default)/documents/usuarios/${uid}/tokens/${id}`, fields: { token: { stringValue: `tok-${id}` }, actualizado: { timestampValue: "2026-10-30T10:00:00Z" }, ...extra } } });
const docPerfil = (uid, extra = {}) => ({ found: { name: `projects/demo/databases/(default)/documents/usuarios/${uid}`, fields: campos({ zona: "America/Bogota", detalleEnAviso: false, ...extra }) } });

//Servidor falso de Google: responde según la URL y guarda las llamadas
const crearFetch = ({ recs = [], perfilesRes = [], tokens = [], clientes = [], admins = [], fcm = () => ({ ok: true }), labs = () => ({ code: "0" }) }) => {
  const llamadas = [];
  const pedir = async (url, init = {}) => {
    const cuerpo = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    llamadas.push({ url: String(url), cuerpo, init });
    const json = (o, status = 200) => ({ ok: status < 300, status, json: async () => o });
    if (String(url).includes("oauth2.googleapis.com")) return json({ access_token: "AT" });
    if (String(url).endsWith(":batchGet")) return json(perfilesRes);
    if (String(url).endsWith(":commit")) return json({});
    if (String(url).endsWith(":runQuery")) {
      const coleccion = cuerpo.structuredQuery.from[0].collectionId;
      return json({ tokens, clientes, super_admins: admins }[coleccion] ?? recs);
    }
    if (String(url).includes("fcm.googleapis.com")) {
      const r = fcm(cuerpo.message);
      return r.ok ? json({ name: "x" }) : json({ error: { details: [{ errorCode: r.codigo }] } }, r.estado || 404);
    }
    if (String(url).includes("api.labsmobile.com")) {
      const r = labs(cuerpo, String(url));
      return json(r, r.http || 200);
    }
    throw new Error(`URL inesperada ${url}`);
  };
  return { pedir, llamadas };
};
const commitDe = (llamadas) => llamadas.find((l) => l.url.endsWith(":commit"))?.cuerpo.writes ?? [];
const enviosDe = (llamadas) => llamadas.filter((l) => l.url.includes("fcm.googleapis.com"));
const smsDe = (llamadas) => llamadas.filter((l) => l.url.includes("api.labsmobile.com"));
const envSms = { ...env, LABS_MOBILE_USER: "yo@correo.co", LABS_MOBILE_TOKEN: "tk" };
const docCli = (uid, extra = {}) => ({ document: { name: `projects/demo/databases/(default)/documents/clientes/${uid}`, fields: { ...campos({ correo: `${uid}@x.co`, nombre: "Ana Pérez", plan: "basico", estado: "activo", ...extra }), vence: { timestampValue: "2026-12-31T04:59:59.999Z" } } } });
const conSms = { smsActivo: true, celular: "+573001234567" };
const A_LAS = (hora) => new Date(`2026-11-10T${hora}:00Z`); //el pago de docRec vence el 10

test("el JWT está bien formado y su firma RS256 verifica con la clave pública", async () => {
  const jwt = await firmarJWT(SA, 1700000000);
  const [cab, datos, firma] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(cab, "base64url")), { alg: "RS256", typ: "JWT", kid: "kid1" });
  const claims = JSON.parse(Buffer.from(datos, "base64url"));
  assert.equal(claims.iss, SA.client_email);
  assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
  assert.equal(claims.exp - claims.iat, 3000);
  assert.match(claims.scope, /datastore/);
  assert.match(claims.scope, /firebase\.messaging/);
  assert.ok(createVerify("RSA-SHA256").update(`${cab}.${datos}`).verify(publicKey, Buffer.from(firma, "base64url")));
});

test("sin pagos en la ventana no consulta perfiles ni tokens ni envía nada", async () => {
  const { pedir, llamadas } = crearFetch({ recs: [{}] });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.avisos, 0);
  assert.equal(llamadas.length, 4); //OAuth + pagos + clientes + super admins (sin destinatarios: nada más)
});

test("envía UN aviso por persona (con 2 pagos) con texto genérico, sin montos ni descripciones", async () => {
  const { pedir, llamadas } = crearFetch({
    recs: [docRec("a", "ana"), docRec("b", "ana", { proximaFecha: "2026-11-10" })],
    perfilesRes: [docPerfil("ana")],
    tokens: [docTok("ana", "t1")],
  });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.deepEqual([r.personas, r.avisos, r.enviados], [1, 2, 1]);
  const envios = enviosDe(llamadas);
  assert.equal(envios.length, 1);
  assert.deepEqual(envios[0].cuerpo.message.data, { tipo: "recordatorio", cantidad: "2", url: "/recurrentes" });
  assert.equal(envios[0].cuerpo.message.webpush.headers.Topic, "recordatorios");
  assert.equal(envios[0].init.headers.Authorization, "Bearer AT");
  //Marca ambos pagos como avisados («antes», porque faltan 3 días)
  const marcas = commitDe(llamadas).filter((w) => w.update);
  assert.equal(marcas.length, 2);
  assert.ok(marcas.every((w) => w.update.fields.ultimoAviso.stringValue === "2026-11-10:antes" && w.currentDocument.exists));
});

test("incluye las descripciones solo si la persona lo activó", async () => {
  const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", { detalleEnAviso: true })], tokens: [docTok("ana", "t1")] });
  await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(enviosDe(llamadas)[0].cuerpo.message.data.detalle, "Pago a");
});

test("no repite un aviso ya enviado (idempotente)", async () => {
  const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana", { ultimoAviso: "2026-11-10:antes" })], perfilesRes: [docPerfil("ana")], tokens: [docTok("ana", "t1")] });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.avisos, 0);
  assert.equal(enviosDe(llamadas).length, 0);
});

test("la fecha de «hoy» es la de la zona de la persona", async () => {
  //13:00 UTC del 7 es 22:00 del 7 en Tokio... y el 8 a las 02:00 en Tokio sería otro día: probamos 20:00 UTC → 05:00 del 8 en Tokio
  const tarde = new Date("2026-11-07T20:00:00Z");
  const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", { zona: "Asia/Tokyo" })], tokens: [docTok("ana", "t1")] });
  const r = await ejecutar(env, { fetch: pedir, ahora: tarde });
  assert.equal(r.avisos, 0); //en Tokio ya es el 8: faltan 2 días, no 3
  assert.equal(enviosDe(llamadas).length, 0);
});

test("token muerto (UNREGISTERED) se borra y, sin otro dispositivo, el aviso NO se marca como enviado", async () => {
  const { pedir, llamadas } = crearFetch({
    recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana")], tokens: [docTok("ana", "t1")],
    fcm: () => ({ ok: false, codigo: "UNREGISTERED" }),
  });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.tokensBorrados, 1);
  const w = commitDe(llamadas);
  assert.equal(w.filter((x) => x.update).length, 0);
  assert.equal(w.filter((x) => x.delete).length, 1);
});

test("un error temporal (500) no borra el token ni marca el aviso", async () => {
  const { pedir, llamadas } = crearFetch({
    recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana")], tokens: [docTok("ana", "t1")],
    fcm: () => ({ ok: false, estado: 503, codigo: "UNAVAILABLE" }),
  });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.tokensBorrados, 0);
  assert.equal(commitDe(llamadas).length, 0);
});

test("con un token muerto y otro bueno, el aviso se marca como enviado", async () => {
  const { pedir, llamadas } = crearFetch({
    recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana")], tokens: [docTok("ana", "malo"), docTok("ana", "bueno")],
    fcm: (m) => (m.token === "tok-malo" ? { ok: false, codigo: "UNREGISTERED" } : { ok: true }),
  });
  await ejecutar(env, { fetch: pedir, ahora: AHORA });
  const w = commitDe(llamadas);
  assert.equal(w.filter((x) => x.update).length, 1);
  assert.equal(w.filter((x) => x.delete).length, 1);
});

test("borra tokens de más de 270 días sin enviarles nada", async () => {
  const viejo = docTok("ana", "viejo", { actualizado: { timestampValue: "2026-01-01T00:00:00Z" } });
  const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana")], tokens: [viejo, docTok("ana", "nuevo")] });
  await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.deepEqual(enviosDe(llamadas).map((l) => l.cuerpo.message.token), ["tok-nuevo"]);
  assert.equal(commitDe(llamadas).filter((x) => x.delete).length, 1);
});

test("máximo 10 dispositivos por persona (los más recientes)", async () => {
  const tokens = Array.from({ length: 12 }, (_, i) => docTok("ana", `t${i}`, { actualizado: { timestampValue: `2026-11-0${(i % 9) + 1}T10:00:00Z` } }));
  const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana")], tokens });
  await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(enviosDe(llamadas).length, 10);
});

test(`tope de ${MAX_ENVIOS} envíos por ejecución (50 subrequests del plan Free)`, async () => {
  const uids = Array.from({ length: 6 }, (_, i) => `u${i}`);
  const { pedir, llamadas } = crearFetch({
    recs: uids.map((u) => docRec(`r-${u}`, u)),
    perfilesRes: uids.map((u) => docPerfil(u)),
    tokens: uids.flatMap((u) => Array.from({ length: 8 }, (_, i) => docTok(u, `${u}-${i}`))),
  });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(enviosDe(llamadas).length, MAX_ENVIOS);
  assert.ok(llamadas.length <= 50, `subrequests: ${llamadas.length}`);
  assert.ok(r.omitidos > 0);
});

test("un fallo de Firestore se propaga sin filtrar el cuerpo de la respuesta", async () => {
  const pedir = async (url) => String(url).includes("oauth2") ? { ok: true, json: async () => ({ access_token: "AT" }) } : { ok: false, status: 403, json: async () => ({ secreto: "x" }) };
  await assert.rejects(ejecutar(env, { fetch: pedir, ahora: AHORA }), (e) => e.message === "Firestore 403");
});

test("8:00: programa el SMS para las 8:30 (13:30 GMT) y todavía no manda el push del día", async () => {
  const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", conSms)], clientes: [docCli("ana")], tokens: [docTok("ana", "t1")] });
  const r = await ejecutar(envSms, { fetch: pedir, ahora: A_LAS("13:00") });
  assert.deepEqual([r.sms, r.avisos], [1, 0]);
  assert.equal(enviosDe(llamadas).length, 0);
  const [sms] = smsDe(llamadas);
  assert.equal(sms.url, "https://api.labsmobile.com/json/send");
  assert.equal(sms.init.headers.Authorization, `Basic ${btoa("yo@correo.co:tk")}`);
  assert.deepEqual(sms.cuerpo, {
    message: "Hoy vence 1 gasto fijo en Finanzas. Registralo en finanzas.zfmanager.com/recurrentes",
    tpoa: "AnaPerez",
    recipient: [{ msisdn: "573001234567" }],
    subid: "fana20261110",
    label: "finanzas-recordatorio",
    scheduled: "2026-11-10 13:30:00",
  });
  const marca = commitDe(llamadas).find((w) => w.updateMask?.fieldPaths[0] === "ultimoSms");
  assert.equal(marca.update.fields.ultimoSms.stringValue, "2026-11-10|fana20261110");
  assert.ok(marca.update.name.endsWith("clientes/ana"));
});

test("el día del pago el push se repite por turno (8:30 y 11:30) con hoy=1 y para cuando ya se avisó ese turno", async () => {
  const base = { perfilesRes: [docPerfil("ana")], clientes: [docCli("ana")], tokens: [docTok("ana", "t1")] };
  let f = crearFetch({ ...base, recs: [docRec("a", "ana")] });
  await ejecutar(env, { fetch: f.pedir, ahora: A_LAS("13:30") });
  assert.equal(enviosDe(f.llamadas)[0].cuerpo.message.data.hoy, "1");
  assert.equal(commitDe(f.llamadas).find((w) => w.update?.fields.ultimoAviso).update.fields.ultimoAviso.stringValue, "2026-11-10:hoy:0");

  f = crearFetch({ ...base, recs: [docRec("a", "ana", { ultimoAviso: "2026-11-10:hoy:0" })] });
  await ejecutar(env, { fetch: f.pedir, ahora: A_LAS("16:30") });
  assert.equal(commitDe(f.llamadas).find((w) => w.update?.fields.ultimoAviso).update.fields.ultimoAviso.stringValue, "2026-11-10:hoy:1");

  f = crearFetch({ ...base, recs: [docRec("a", "ana", { ultimoAviso: "2026-11-10:hoy:1" })] });
  const r = await ejecutar(env, { fetch: f.pedir, ahora: A_LAS("16:45") });
  assert.equal(r.avisos, 0);
  assert.equal(smsDe(f.llamadas).length, 0); //sin smsActivo no hay SMS
});

test("si el SMS de las 8:00 falló (code 35) no se marca, y a las 8:30 sale de inmediato", async () => {
  const base = { recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", conSms)], clientes: [docCli("ana")], tokens: [docTok("ana", "t1")] };
  let f = crearFetch({ ...base, labs: () => ({ code: "35", message: "sin créditos" }) });
  let r = await ejecutar(envSms, { fetch: f.pedir, ahora: A_LAS("13:00") });
  assert.deepEqual([r.sms, r.smsFallidos], [0, 1]);
  assert.equal(commitDe(f.llamadas).length, 0);

  f = crearFetch(base);
  r = await ejecutar(envSms, { fetch: f.pedir, ahora: A_LAS("13:30") });
  assert.equal(r.sms, 1);
  assert.equal(smsDe(f.llamadas)[0].cuerpo.scheduled, undefined);
});

test("no hay SMS sin activar, con celular inválido, con plan vencido, ya enviado hoy o sin credenciales", async () => {
  const casos = [
    [env, { perfil: conSms, cliente: {} }],
    [envSms, { perfil: { smsActivo: false, celular: "+573001234567" }, cliente: {} }],
    [envSms, { perfil: { smsActivo: true, celular: "3001234567" }, cliente: {} }],
    [envSms, { perfil: conSms, cliente: { estado: "suspendido" } }],
    [envSms, { perfil: conSms, cliente: { ultimoSms: "2026-11-10|cancelado" } }],
  ];
  for (const [entorno, { perfil, cliente }] of casos) {
    const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", perfil)], clientes: [docCli("ana", cliente)], tokens: [docTok("ana", "t1")] });
    await ejecutar(entorno, { fetch: pedir, ahora: A_LAS("13:00") });
    assert.equal(smsDe(llamadas).length, 0);
  }
});

test(`tope de ${MAX_SMS} SMS por ejecución`, async () => {
  const uids = Array.from({ length: MAX_SMS + 2 }, (_, i) => `p${i}`);
  const { pedir, llamadas } = crearFetch({
    recs: uids.map((u) => docRec(`r${u}`, u)),
    perfilesRes: uids.map((u) => docPerfil(u, conSms)),
    clientes: uids.map((u) => docCli(u)),
  });
  const r = await ejecutar(envSms, { fetch: pedir, ahora: A_LAS("13:00") });
  assert.equal(smsDe(llamadas).length, MAX_SMS);
  assert.deepEqual([r.sms, r.smsOmitidos], [MAX_SMS, 2]);
});
