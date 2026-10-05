//Pruebas de las reglas de Firestore contra el emulador (puerto propio para no chocar con otros).
//Uso: npm run test:reglas
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } = require("firebase/firestore");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const gasto = (uid, extra = {}) => ({ descripcion: "Arriendo", cantidad: 100, categoria: "hogar", fecha: 1700000000, uidUsuario: uid, ...extra });
const recurrente = (uid, extra = {}) => ({ descripcion: "Nómina", cantidad: 1500000, categoria: "nomina", frecuencia: "mensual", dia: 10, mes: 0, proximaFecha: "2026-11-10", activo: true, creado: serverTimestamp(), uidUsuario: uid, ...extra });
const TOKEN = "t".repeat(150);
const idToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
let ok = 0, mal = 0;
const caso = async (nombre, fn) => {
  try { await fn(); ok++; console.log("  ✓", nombre); } catch (e) { mal++; console.log("  ✗", nombre, "→", e.message.split("\n")[0]); }
};

(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8181").split(":");
  const env = await initializeTestEnvironment({
    projectId: "demo-reglas",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8"), host, port: Number(port) },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    await setDoc(doc(d, "gastos/deAna"), gasto("ana"));
    await setDoc(doc(d, "categorias/AAAAAAAAAAAAAAAAAAAA"), { nombre: "Publicidad", icono: "megafono", color: "rosa", uidUsuario: "ana" });
    await setDoc(doc(d, "recurrentes/deAna"), { ...recurrente("ana"), creado: new Date(), ultimoAviso: "2026-11-10:antes" });
    await setDoc(doc(d, "categorias/BBBBBBBBBBBBBBBBBBBB"), { nombre: "De Beto", icono: "caja", color: "azul", uidUsuario: "beto" });
  });
  const ana = env.authenticatedContext("ana").firestore();
  const beto = env.authenticatedContext("beto").firestore();
  const anon = env.unauthenticatedContext().firestore();

  console.log("Gastos:");
  await caso("dueño crea gasto válido", () => assertSucceeds(setDoc(doc(ana, "gastos/n1"), gasto("ana"))));
  await caso("NO crear a nombre de otro uid", () => assertFails(setDoc(doc(beto, "gastos/n2"), gasto("ana"))));
  await caso("NO crear sin login", () => assertFails(setDoc(doc(anon, "gastos/n3"), gasto("ana"))));
  await caso("NO cantidad negativa", () => assertFails(setDoc(doc(ana, "gastos/n4"), gasto("ana", { cantidad: -5 }))));
  await caso("NO cantidad como texto", () => assertFails(setDoc(doc(ana, "gastos/n5"), gasto("ana", { cantidad: "10" }))));
  await caso("NO categoría inventada", () => assertFails(setDoc(doc(ana, "gastos/n6"), gasto("ana", { categoria: "inventada" }))));
  await caso("NO campos extra", () => assertFails(setDoc(doc(ana, "gastos/n7"), gasto("ana", { admin: true }))));
  await caso("dueño lee su gasto", () => assertSucceeds(getDoc(doc(ana, "gastos/deAna"))));
  await caso("NO leer gasto ajeno", () => assertFails(getDoc(doc(beto, "gastos/deAna"))));
  await caso("consulta filtrada por uid propio", () => assertSucceeds(getDocs(query(collection(ana, "gastos"), where("uidUsuario", "==", "ana")))));
  await caso("NO consultar gastos de otro uid", () => assertFails(getDocs(query(collection(beto, "gastos"), where("uidUsuario", "==", "ana")))));
  await caso("dueño edita su gasto", () => assertSucceeds(updateDoc(doc(ana, "gastos/deAna"), { descripcion: "Nuevo", cantidad: 50, categoria: "comida", fecha: 1700000500 })));
  await caso("NO editar gasto ajeno", () => assertFails(updateDoc(doc(beto, "gastos/deAna"), { cantidad: 1 })));
  await caso("NO cambiar uidUsuario", () => assertFails(updateDoc(doc(ana, "gastos/deAna"), { uidUsuario: "beto" })));
  await caso("NO borrar gasto ajeno", () => assertFails(deleteDoc(doc(beto, "gastos/deAna"))));

  console.log("Categorías nuevas por defecto:");
  for (const c of ["nomina", "recibos", "creditos", "impuestos"]) {
    await caso(`gasto en «${c}»`, () => assertSucceeds(setDoc(doc(ana, `gastos/c_${c}`), gasto("ana", { categoria: c }))));
  }

  console.log("Categorías propias:");
  await caso("crear categoría propia válida", () => assertSucceeds(setDoc(doc(ana, "categorias/CCCCCCCCCCCCCCCCCCCC"), { nombre: "Gimnasio", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO crear a nombre de otro", () => assertFails(setDoc(doc(beto, "categorias/DDDDDDDDDDDDDDDDDDDD"), { nombre: "X", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO crear sin login", () => assertFails(setDoc(doc(anon, "categorias/EEEEEEEEEEEEEEEEEEEE"), { nombre: "X", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO nombre vacío", () => assertFails(setDoc(doc(ana, "categorias/FFFFFFFFFFFFFFFFFFFF"), { nombre: "", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO nombre de más de 30 caracteres", () => assertFails(setDoc(doc(ana, "categorias/GGGGGGGGGGGGGGGGGGGG"), { nombre: "x".repeat(31), icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO icono fuera del set", () => assertFails(setDoc(doc(ana, "categorias/HHHHHHHHHHHHHHHHHHHH"), { nombre: "X", icono: "<script>", color: "verde", uidUsuario: "ana" })));
  await caso("NO color fuera de la paleta", () => assertFails(setDoc(doc(ana, "categorias/IIIIIIIIIIIIIIIIIIII"), { nombre: "X", icono: "pata", color: "#ff0000", uidUsuario: "ana" })));
  await caso("NO campos extra", () => assertFails(setDoc(doc(ana, "categorias/JJJJJJJJJJJJJJJJJJJJ"), { nombre: "X", icono: "pata", color: "verde", uidUsuario: "ana", admin: true })));
  await caso("dueño lee sus categorías", () => assertSucceeds(getDocs(query(collection(ana, "categorias"), where("uidUsuario", "==", "ana")))));
  await caso("NO leer categorías ajenas", () => assertFails(getDocs(query(collection(beto, "categorias"), where("uidUsuario", "==", "ana")))));
  await caso("dueño edita su categoría", () => assertSucceeds(updateDoc(doc(ana, "categorias/AAAAAAAAAAAAAAAAAAAA"), { nombre: "Marketing", icono: "megafono", color: "azul" })));
  await caso("NO editar categoría ajena", () => assertFails(updateDoc(doc(ana, "categorias/BBBBBBBBBBBBBBBBBBBB"), { nombre: "Robada" })));
  await caso("NO cambiar el dueño de una categoría", () => assertFails(updateDoc(doc(ana, "categorias/AAAAAAAAAAAAAAAAAAAA"), { uidUsuario: "beto" })));
  await caso("NO borrar categoría ajena", () => assertFails(deleteDoc(doc(ana, "categorias/BBBBBBBBBBBBBBBBBBBB"))));
  await caso("gasto en categoría propia", () => assertSucceeds(setDoc(doc(ana, "gastos/c_propia"), gasto("ana", { categoria: "AAAAAAAAAAAAAAAAAAAA" }))));
  await caso("NO gasto en categoría propia de OTRA persona", () => assertFails(setDoc(doc(ana, "gastos/c_ajena"), gasto("ana", { categoria: "BBBBBBBBBBBBBBBBBBBB" }))));
  await caso("NO gasto en categoría propia que no existe", () => assertFails(setDoc(doc(ana, "gastos/c_nada"), gasto("ana", { categoria: "ZZZZZZZZZZZZZZZZZZZZ" }))));
  await caso("dueño borra su categoría", () => assertSucceeds(deleteDoc(doc(ana, "categorias/CCCCCCCCCCCCCCCCCCCC"))));

  console.log("Recurrentes:");
  await caso("dueño crea recurrente mensual", () => assertSucceeds(setDoc(doc(ana, "recurrentes/r1"), recurrente("ana"))));
  await caso("crear semanal, quincenal y anual válidos", async () => {
    await assertSucceeds(setDoc(doc(ana, "recurrentes/r2"), recurrente("ana", { frecuencia: "semanal", dia: 5 })));
    await assertSucceeds(setDoc(doc(ana, "recurrentes/r3"), recurrente("ana", { frecuencia: "quincenal", dia: 0 })));
    await assertSucceeds(setDoc(doc(ana, "recurrentes/r4"), recurrente("ana", { frecuencia: "anual", dia: 31, mes: 12 })));
  });
  await caso("recurrente con categoría propia", () => assertSucceeds(setDoc(doc(ana, "recurrentes/r5"), recurrente("ana", { categoria: "AAAAAAAAAAAAAAAAAAAA" }))));
  await caso("NO crear a nombre de otro", () => assertFails(setDoc(doc(beto, "recurrentes/x1"), recurrente("ana"))));
  await caso("NO crear sin login", () => assertFails(setDoc(doc(anon, "recurrentes/x2"), recurrente("ana"))));
  await caso("NO campos extra", () => assertFails(setDoc(doc(ana, "recurrentes/x3"), recurrente("ana", { admin: true }))));
  await caso("NO falta un campo", () => { const r = recurrente("ana"); delete r.activo; return assertFails(setDoc(doc(ana, "recurrentes/x4"), r)); });
  await caso("NO cantidad ≤ 0 ni texto ni enorme", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/x5"), recurrente("ana", { cantidad: 0 })));
    await assertFails(setDoc(doc(ana, "recurrentes/x6"), recurrente("ana", { cantidad: "10" })));
    await assertFails(setDoc(doc(ana, "recurrentes/x7"), recurrente("ana", { cantidad: 1e13 })));
  });
  await caso("NO descripción vacía ni de más de 60", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/x8"), recurrente("ana", { descripcion: "" })));
    await assertFails(setDoc(doc(ana, "recurrentes/x9"), recurrente("ana", { descripcion: "x".repeat(61) })));
  });
  await caso("NO categoría inventada ni ajena", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/y1"), recurrente("ana", { categoria: "inventada" })));
    await assertFails(setDoc(doc(ana, "recurrentes/y2"), recurrente("ana", { categoria: "BBBBBBBBBBBBBBBBBBBB" })));
  });
  await caso("NO frecuencia desconocida", () => assertFails(setDoc(doc(ana, "recurrentes/y3"), recurrente("ana", { frecuencia: "diaria" }))));
  await caso("NO día fuera de rango para su frecuencia", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/y4"), recurrente("ana", { dia: 32 })));
    await assertFails(setDoc(doc(ana, "recurrentes/y5"), recurrente("ana", { dia: 0 })));
    await assertFails(setDoc(doc(ana, "recurrentes/y6"), recurrente("ana", { frecuencia: "semanal", dia: 8 })));
    await assertFails(setDoc(doc(ana, "recurrentes/y7"), recurrente("ana", { frecuencia: "quincenal", dia: 15 })));
    await assertFails(setDoc(doc(ana, "recurrentes/y8"), recurrente("ana", { frecuencia: "anual", dia: 10, mes: 0 })));
    await assertFails(setDoc(doc(ana, "recurrentes/y9"), recurrente("ana", { dia: 10, mes: 3 })));
  });
  await caso("NO fecha con formato inválido", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/z1"), recurrente("ana", { proximaFecha: "10/11/2026" })));
    await assertFails(setDoc(doc(ana, "recurrentes/z2"), recurrente("ana", { proximaFecha: "2026-13-10" })));
  });
  await caso("NO `creado` falso ni `activo` como texto", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/z3"), recurrente("ana", { creado: new Date(2020, 0, 1) })));
    await assertFails(setDoc(doc(ana, "recurrentes/z4"), recurrente("ana", { activo: "si" })));
  });
  await caso("NO crear con `ultimoAviso` (solo el emisor)", () => assertFails(setDoc(doc(ana, "recurrentes/z5"), recurrente("ana", { ultimoAviso: "2026-11-10:hoy" }))));
  await caso("dueño lee y consulta sus recurrentes", async () => {
    await assertSucceeds(getDoc(doc(ana, "recurrentes/deAna")));
    await assertSucceeds(getDocs(query(collection(ana, "recurrentes"), where("uidUsuario", "==", "ana"))));
  });
  await caso("NO leer ni consultar recurrentes ajenos", async () => {
    await assertFails(getDoc(doc(beto, "recurrentes/deAna")));
    await assertFails(getDocs(query(collection(beto, "recurrentes"), where("uidUsuario", "==", "ana"))));
  });
  await caso("dueño edita (pausar y avanzar fecha)", () => assertSucceeds(updateDoc(doc(ana, "recurrentes/deAna"), { activo: false, proximaFecha: "2026-12-10" })));
  await caso("NO editar recurrente ajeno", () => assertFails(updateDoc(doc(beto, "recurrentes/deAna"), { activo: false })));
  await caso("NO cambiar uidUsuario ni creado", async () => {
    await assertFails(updateDoc(doc(ana, "recurrentes/deAna"), { uidUsuario: "beto" }));
    await assertFails(updateDoc(doc(ana, "recurrentes/deAna"), { creado: new Date() }));
  });
  await caso("NO tocar `ultimoAviso` desde el cliente", async () => {
    await assertFails(updateDoc(doc(ana, "recurrentes/deAna"), { ultimoAviso: "2030-01-01:hoy" }));
    await assertFails(updateDoc(doc(ana, "recurrentes/deAna"), { ultimoAviso: null }));
  });
  await caso("NO editar con datos inválidos", () => assertFails(updateDoc(doc(ana, "recurrentes/deAna"), { cantidad: -1 })));
  await caso("NO borrar recurrente ajeno", () => assertFails(deleteDoc(doc(beto, "recurrentes/deAna"))));
  await caso("dueño borra el suyo", () => assertSucceeds(deleteDoc(doc(ana, "recurrentes/r1"))));
  await caso("registrar pago: gasto con id fijo + avance de fecha en un batch", async () => {
    const { writeBatch } = require("firebase/firestore");
    const lote = writeBatch(ana);
    lote.set(doc(ana, "gastos/rec_r2_2026-11-10"), gasto("ana", { descripcion: "Nómina", categoria: "nomina" }));
    lote.update(doc(ana, "recurrentes/r2"), { proximaFecha: "2026-11-17" });
    await assertSucceeds(lote.commit());
  });

  console.log("Perfil y tokens de notificaciones:");
  const perfil = (extra = {}) => ({ zona: "America/Bogota", detalleEnAviso: false, actualizado: serverTimestamp(), ...extra });
  const tok = (extra = {}) => ({ token: TOKEN, plataforma: "android", actualizado: serverTimestamp(), ...extra });
  await caso("dueño guarda su perfil", () => assertSucceeds(setDoc(doc(ana, "usuarios/ana"), perfil())));
  await caso("NO perfil ajeno, con campos extra, zona inválida o fecha falsa", async () => {
    await assertFails(setDoc(doc(beto, "usuarios/ana"), perfil()));
    await assertFails(setDoc(doc(ana, "usuarios/ana"), perfil({ admin: true })));
    await assertFails(setDoc(doc(ana, "usuarios/ana"), perfil({ zona: "<script>" })));
    await assertFails(setDoc(doc(ana, "usuarios/ana"), perfil({ actualizado: new Date(2020, 0, 1) })));
  });
  await caso("dueño lee su perfil; otro no", async () => {
    await assertSucceeds(getDoc(doc(ana, "usuarios/ana")));
    await assertFails(getDoc(doc(beto, "usuarios/ana")));
  });
  await caso("dueño guarda su token (id = SHA-256)", () => assertSucceeds(setDoc(doc(ana, `usuarios/ana/tokens/${idToken(TOKEN)}`), tok())));
  await caso("NO token con id que no es su hash", () => assertFails(setDoc(doc(ana, "usuarios/ana/tokens/abc"), tok())));
  await caso("NO token de otro uid", () => assertFails(setDoc(doc(beto, `usuarios/ana/tokens/${idToken(TOKEN)}`), tok())));
  await caso("NO token corto, con campos extra o plataforma inválida", async () => {
    await assertFails(setDoc(doc(ana, `usuarios/ana/tokens/${idToken("corto")}`), tok({ token: "corto" })));
    await assertFails(setDoc(doc(ana, `usuarios/ana/tokens/${idToken(TOKEN)}`), tok({ extra: 1 })));
    await assertFails(setDoc(doc(ana, `usuarios/ana/tokens/${idToken(TOKEN)}`), tok({ plataforma: "nokia" })));
  });
  await caso("dueño lee y borra su token; otro no", async () => {
    await assertFails(getDoc(doc(beto, `usuarios/ana/tokens/${idToken(TOKEN)}`)));
    await assertFails(deleteDoc(doc(beto, `usuarios/ana/tokens/${idToken(TOKEN)}`)));
    await assertSucceeds(getDoc(doc(ana, `usuarios/ana/tokens/${idToken(TOKEN)}`)));
    await assertSucceeds(deleteDoc(doc(ana, `usuarios/ana/tokens/${idToken(TOKEN)}`)));
  });

  console.log("Otras colecciones:");
  await caso("colección desconocida denegada", () => assertFails(setDoc(doc(ana, "otra/x"), { a: 1 })));

  await env.cleanup();
  console.log(`\n${ok} correctos, ${mal} fallidos`);
  process.exit(mal ? 1 : 0);
})();
