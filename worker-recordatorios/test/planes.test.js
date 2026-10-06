import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { etapaDeAviso, avisosAClientes, resumenParaAdmins, lunesDeLaSemana } from "../src/planes.js";
import { ejecutar } from "../src/recordatorios.js";

const AHORA = new Date("2026-11-07T13:00:00Z"); //sábado 07:?? → 08:00 en Bogotá
const MS = AHORA.getTime();
const DIA = 86400000;
//Un plan que vence `dias` días de calendario después de hoy, al cierre del día en Colombia (así lo guarda la app)
const vencen = (dias) => new Date(Math.floor((MS - 5 * 3600000) / DIA) * DIA + (dias + 1) * DIA - 1 + 5 * 3600000).toISOString();
const cli = (id, dias, extra = {}) => ({ id, ruta: `projects/demo/databases/(default)/documents/clientes/${id}`, estado: "activo", vence: vencen(dias), ...extra });

test("etapas de aviso: 7, 3, 0 y -1 (venció), y nada fuera de esos rangos", () => {
  assert.equal(etapaDeAviso(cli("a", 8), MS), null);
  assert.deepEqual(etapaDeAviso(cli("a", 7), MS), { etapa: 7, dias: 7 });
  assert.deepEqual(etapaDeAviso(cli("a", 4), MS), { etapa: 7, dias: 4 });
  assert.deepEqual(etapaDeAviso(cli("a", 3), MS), { etapa: 3, dias: 3 });
  assert.deepEqual(etapaDeAviso(cli("a", 0), MS), { etapa: 0, dias: 0 });
  assert.deepEqual(etapaDeAviso(cli("a", -1), MS), { etapa: -1, dias: -1 });
  assert.equal(etapaDeAviso(cli("a", -4), MS), null); //muy viejo
  assert.equal(etapaDeAviso(cli("a", 2, { estado: "suspendido" }), MS), null);
});

test("no repite el mismo aviso, pero sí avisa al cambiar de etapa (idempotente y con reintento)", () => {
  const c = cli("a", 3);
  const [aviso] = avisosAClientes([c], MS);
  assert.deepEqual(aviso.datos, { tipo: "plan", dias: "3", url: "/plan" });
  assert.equal(aviso.campo, "ultimoAvisoPlan");
  assert.deepEqual(avisosAClientes([{ ...c, ultimoAvisoPlan: aviso.clave }], MS), []); //ya avisado
  //Si el cron falló el día 3, al día siguiente (2 días) sigue en la etapa 3 y se avisa; si ya había avisado, no
  assert.equal(avisosAClientes([cli("b", 2)], MS).length, 1);
  //Al pasar a otra etapa se vuelve a avisar
  assert.equal(avisosAClientes([cli("a", 0, { vence: vencen(0), ultimoAvisoPlan: `${vencen(0)}:3` })], MS).length, 1);
  //Renovar cambia el vencimiento: el marcador anterior ya no aplica
  assert.deepEqual(avisosAClientes([cli("a", 20, { ultimoAvisoPlan: aviso.clave })], MS), []);
});

test("resumen semanal para el super admin: una vez por semana (lunes de Colombia) y solo si hay algo", () => {
  assert.equal(lunesDeLaSemana(AHORA), "2026-11-02");
  const admin = { id: "root", ruta: "projects/demo/databases/(default)/documents/super_admins/root" };
  const clientes = [cli("a", 2), cli("b", 6), cli("c", -2), cli("d", 40), cli("e", 3, { estado: "suspendido" })];
  const [r] = resumenParaAdmins([admin], clientes, AHORA);
  assert.deepEqual(r.datos, { tipo: "resumen-planes", porVencer: "2", vencidos: "1", url: "/admin" });
  assert.equal(r.clave, "2026-11-02");
  assert.deepEqual(resumenParaAdmins([{ ...admin, ultimoResumenPlanes: "2026-11-02" }], clientes, AHORA), []);
  assert.equal(resumenParaAdmins([{ ...admin, ultimoResumenPlanes: "2026-10-26" }], clientes, AHORA).length, 1);
  assert.deepEqual(resumenParaAdmins([admin], [cli("d", 40)], AHORA), []);
});

//---- Integración con el ciclo completo ----
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = { GCP_PROJECT_ID: "demo", GOOGLE_SA_JSON: JSON.stringify({ client_email: "e@demo.iam.gserviceaccount.com", private_key_id: "k", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }) };
const docFs = (ruta, campos) => ({ document: { name: `projects/demo/databases/(default)/documents/${ruta}`, fields: campos } });
const docCliente = (id, dias, extra = {}) => docFs(`clientes/${id}`, { estado: { stringValue: "activo" }, vence: { timestampValue: vencen(dias) }, limites: { mapValue: { fields: { dispositivos: { integerValue: "1" } } } }, ...extra });
const docToken = (uid, id, act) => docFs(`usuarios/${uid}/tokens/${id}`, { token: { stringValue: `tok-${id}` }, actualizado: { timestampValue: act } });

const servidor = ({ clientes = [], admins = [], tokens = [] }) => {
  const llamadas = [];
  const pedir = async (url, init = {}) => {
    const cuerpo = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    llamadas.push({ url: String(url), cuerpo });
    const json = (o) => ({ ok: true, status: 200, json: async () => o });
    if (String(url).includes("oauth2")) return json({ access_token: "AT" });
    if (String(url).endsWith(":commit")) return json({});
    if (String(url).includes("fcm")) return json({ name: "x" });
    if (String(url).endsWith(":runQuery")) {
      const c = cuerpo.structuredQuery.from[0].collectionId;
      return json(c === "clientes" ? clientes : c === "super_admins" ? admins : c === "tokens" ? tokens : []);
    }
    throw new Error(`URL inesperada ${url}`);
  };
  return { pedir, llamadas };
};

test("ciclo completo: avisa al cliente y al admin, respeta el cupo de dispositivos y marca lo avisado", async () => {
  const { pedir, llamadas } = servidor({
    clientes: [docCliente("ana", 3)],
    admins: [docFs("super_admins/root", {})],
    tokens: [docToken("ana", "t1", "2026-11-06T10:00:00Z"), docToken("ana", "t2", "2026-11-05T10:00:00Z"), docToken("root", "r1", "2026-11-06T10:00:00Z")],
  });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.deepEqual([r.avisosPlan, r.resumenesAdmin], [1, 1]);
  const envios = llamadas.filter((l) => l.url.includes("fcm")).map((l) => l.cuerpo.message);
  //ana tiene plan de 1 dispositivo: solo el más reciente; el sobrante se borra
  assert.deepEqual(envios.filter((m) => m.data.tipo === "plan").map((m) => m.token), ["tok-t1"]);
  assert.deepEqual(envios.filter((m) => m.data.tipo === "resumen-planes").map((m) => m.token), ["tok-r1"]);
  const w = llamadas.find((l) => l.url.endsWith(":commit")).cuerpo.writes;
  assert.ok(w.some((x) => x.updateMask?.fieldPaths[0] === "ultimoAvisoPlan" && x.update.name.endsWith("clientes/ana")));
  assert.ok(w.some((x) => x.updateMask?.fieldPaths[0] === "ultimoResumenPlanes"));
  assert.ok(w.some((x) => x.delete?.endsWith("/tokens/t2")));
});

test("sin dispositivos no se marca como avisado (se reintenta mañana)", async () => {
  const { pedir, llamadas } = servidor({ clientes: [docCliente("ana", 0)], tokens: [] });
  const r = await ejecutar(env, { fetch: pedir, ahora: AHORA });
  assert.equal(r.avisosPlan, 1);
  assert.equal(r.enviados, 0);
  assert.equal(llamadas.filter((l) => l.url.endsWith(":commit")).length, 0);
});
