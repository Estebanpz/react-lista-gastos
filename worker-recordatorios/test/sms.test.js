import { test } from "node:test";
import assert from "node:assert/strict";
import { enviarSms, cancelarSmsProgramado, revisarSmsProgramado } from "../src/sms.js";

const env = { GCP_PROJECT_ID: "demo", LABS_MOBILE_USER: "yo@correo.co", LABS_MOBILE_TOKEN: "tk" };
const json = (o, status = 200) => ({ ok: status < 300, status, json: async () => o });
const ENVIO = { numero: "573001234567", mensaje: "Hola", remitente: "Ana", subid: "fana20261110" };
const RUTA = "projects/demo/databases/(default)/documents/clientes/ana";
const cliente = (ultimoSms) => ({ name: RUTA, fields: { ultimoSms: { stringValue: ultimoSms } } });

//Firestore + LabsMobile falsos para /sms/revisar
const crear = ({ doc = cliente("2026-11-10|fana20261110"), pendientes = [], labs = { code: "0" } } = {}) => {
  const llamadas = [];
  const pedir = async (url, init = {}) => {
    llamadas.push({ url: String(url), cuerpo: init.body ? JSON.parse(init.body) : null });
    if (String(url).includes("api.labsmobile.com")) return json(labs);
    if (String(url).endsWith(":runQuery")) return json(pendientes.map((p) => ({ document: p })));
    if (String(url).endsWith(":commit")) return json({});
    if (String(url).endsWith("/clientes/ana")) return doc ? json(doc) : json({}, 404);
    throw new Error(`URL inesperada ${url}`);
  };
  return { pedir, llamadas };
};

test("enviarSms lanza si LabsMobile responde HTTP 200 con un code distinto de 0", async () => {
  const pedir = async () => json({ code: "27", message: "caracteres inválidos" });
  await assert.rejects(enviarSms(env, pedir, ENVIO), (e) => e.codigoLabsMobile === "27");
});

test("enviarSms acepta code 0 (texto o número)", async () => {
  assert.equal((await enviarSms(env, async () => json({ code: 0 }), ENVIO)).code, 0);
});

test("cancelar: 0 y 52 cuentan como hecho; otro código no", async () => {
  assert.equal(await cancelarSmsProgramado(env, async () => json({ code: "0" }), "x"), true);
  assert.equal(await cancelarSmsProgramado(env, async () => json({ code: "52" }, 400), "x"), true);
  assert.equal(await cancelarSmsProgramado(env, async () => json({ code: "30" }), "x"), false);
  //nunca cancela «todos» ni sin subid, y ni siquiera llama a LabsMobile
  let llamo = false;
  const espia = async () => { llamo = true; return json({ code: "0" }); };
  assert.equal(await cancelarSmsProgramado(env, espia, "*"), false);
  assert.equal(await cancelarSmsProgramado(env, espia, ""), false);
  assert.equal(llamo, false);
});

test("revisar a las 8:10: sin pagos de hoy cancela el programado y marca «cancelado»", async () => {
  const { pedir, llamadas } = crear();
  assert.equal(await revisarSmsProgramado(env, "AT", pedir, "ana", new Date("2026-11-10T13:10:00Z")), "cancelado");
  const labs = llamadas.find((l) => l.url.includes("labsmobile"));
  assert.deepEqual([labs.url, labs.cuerpo], ["https://api.labsmobile.com/json/scheduled", { cmd: "cancel", subid: "fana20261110" }]);
  const commit = llamadas.find((l) => l.url.endsWith(":commit")).cuerpo.writes[0];
  assert.equal(commit.update.fields.ultimoSms.stringValue, "2026-11-10|cancelado");
});

test("revisar: con otro pago que vence hoy sigue; después de las 8:30, sin SMS de hoy o sin credenciales no hace nada", async () => {
  const pendiente = { name: "projects/demo/databases/(default)/documents/recurrentes/ana_2", fields: {} };
  assert.equal(await revisarSmsProgramado(env, "AT", crear({ pendientes: [pendiente] }).pedir, "ana", new Date("2026-11-10T13:10:00Z")), "sigue");
  assert.equal(await revisarSmsProgramado(env, "AT", crear().pedir, "ana", new Date("2026-11-10T13:30:00Z")), "nada");
  assert.equal(await revisarSmsProgramado(env, "AT", crear({ doc: cliente("2026-11-09|fana20261109") }).pedir, "ana", new Date("2026-11-10T13:10:00Z")), "nada");
  assert.equal(await revisarSmsProgramado({ GCP_PROJECT_ID: "demo" }, "AT", crear().pedir, "ana", new Date("2026-11-10T13:10:00Z")), "nada");
});
