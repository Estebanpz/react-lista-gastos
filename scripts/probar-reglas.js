//Pruebas de las reglas de Firestore contra el emulador (puerto propio para no chocar con otros).
//Uso: npm run test:reglas
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp, writeBatch, Timestamp, increment } = require("firebase/firestore");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const gasto = (uid, extra = {}) => ({ descripcion: "Arriendo", cantidad: 100, categoria: "hogar", fecha: 1700000000, uidUsuario: uid, ...extra });
const recurrente = (uid, extra = {}) => ({ descripcion: "Nómina", cantidad: 1500000, categoria: "nomina", frecuencia: "mensual", dia: 10, mes: 0, proximaFecha: "2026-11-10", activo: true, creado: serverTimestamp(), uidUsuario: uid, ...extra });
const TOKEN = "t".repeat(150);
const idToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
const AHORA = new Date();
const EN = (dias) => Timestamp.fromDate(new Date(AHORA.getTime() + dias * 86400000));
const limites = (extra = {}) => ({ gastosMes: 1000, pagosActivos: 25, categorias: 20, dispositivos: 5, ...extra });
const cliente = (correo, extra = {}) => ({ correo, plan: "plus", estado: "activo", vence: EN(30), limites: limites(), creado: Timestamp.fromDate(AHORA), actualizado: serverTimestamp(), ...extra });
//El mes se cuenta en hora de Colombia (UTC-5), igual que firestore.rules y la app
const claveUso = (uid) => {
  const local = new Date(AHORA.getTime() - 5 * 3600000);
  return `${uid}_${local.getUTCFullYear()}_${local.getUTCMonth() + 1}`;
};

//Un gasto nuevo siempre va en el mismo lote que el +1 del contador del mes. Igual que la app: el +1 lo pone el
//servidor (`increment`), así los gastos registrados sin conexión no chocan entre sí. `sumar` permite probar saltos.
const crearGasto = (bd, ruta, datos, { sumar = 1 } = {}) => {
  const lote = writeBatch(bd);
  lote.set(doc(bd, ruta), datos);
  lote.set(doc(bd, "uso", claveUso(datos.uidUsuario)), { gastos: increment(sumar), uidUsuario: datos.uidUsuario }, { merge: true });
  return lote.commit();
};
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
    await setDoc(doc(d, "super_admins/root"), { creado: 1 });
    await setDoc(doc(d, "clientes/carla"), cliente("carla@prueba.test", { limites: limites({ gastosMes: 2 }) }));
    await setDoc(doc(d, "clientes/vera"), cliente("vera@prueba.test", { vence: EN(-3) }));
    await setDoc(doc(d, "clientes/sara"), cliente("sara@prueba.test", { estado: "suspendido" }));
    for (const u of ["ana", "beto"]) await setDoc(doc(d, `clientes/${u}`), cliente(`${u}@prueba.test`));
    await setDoc(doc(d, "gastos/deAna"), gasto("ana"));
    await setDoc(doc(d, "categorias/AAAAAAAAAAAAAAAAAAAA"), { nombre: "Publicidad", icono: "megafono", color: "rosa", uidUsuario: "ana" });
    await setDoc(doc(d, "recurrentes/deAna"), { ...recurrente("ana"), creado: new Date(), ultimoAviso: "2026-11-10:antes" });
    await setDoc(doc(d, "categorias/BBBBBBBBBBBBBBBBBBBB"), { nombre: "De Beto", icono: "caja", color: "azul", uidUsuario: "beto" });
  });
  const ana = env.authenticatedContext("ana").firestore();
  const beto = env.authenticatedContext("beto").firestore();
  const anon = env.unauthenticatedContext().firestore();
  const root = env.authenticatedContext("root").firestore();
  const carla = env.authenticatedContext("carla").firestore(); //plan con tope de 2 gastos al mes
  const vera = env.authenticatedContext("vera").firestore(); //plan vencido
  const sara = env.authenticatedContext("sara").firestore(); //plan suspendido
  const nadie = env.authenticatedContext("nadie").firestore(); //sin documento de plan

  console.log("Gastos:");
  await caso("dueño crea gasto válido", () => assertSucceeds(crearGasto(ana, "gastos/n1", gasto("ana"))));
  await caso("NO crear a nombre de otro uid", () => assertFails(crearGasto(beto, "gastos/n2", gasto("ana"))));
  await caso("NO crear sin login", () => assertFails(crearGasto(anon, "gastos/n3", gasto("ana"))));
  await caso("NO cantidad negativa", () => assertFails(crearGasto(ana, "gastos/n4", gasto("ana", { cantidad: -5 }))));
  await caso("NO cantidad como texto", () => assertFails(crearGasto(ana, "gastos/n5", gasto("ana", { cantidad: "10" }))));
  await caso("NO categoría inventada", () => assertFails(crearGasto(ana, "gastos/n6", gasto("ana", { categoria: "inventada" }))));
  await caso("NO campos extra", () => assertFails(crearGasto(ana, "gastos/n7", gasto("ana", { admin: true }))));
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
    await caso(`gasto en «${c}»`, () => assertSucceeds(crearGasto(ana, `gastos/c_${c}`, gasto("ana", { categoria: c }))));
  }

  console.log("Categorías propias:");
  await caso("crear categoría propia válida", () => assertSucceeds(setDoc(doc(ana, "categorias/ana_1"), { nombre: "Gimnasio", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO crear a nombre de otro", () => assertFails(setDoc(doc(beto, "categorias/DDDDDDDDDDDDDDDDDDDD"), { nombre: "X", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO crear sin login", () => assertFails(setDoc(doc(anon, "categorias/EEEEEEEEEEEEEEEEEEEE"), { nombre: "X", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO nombre vacío", () => assertFails(setDoc(doc(ana, "categorias/ana_20"), { nombre: "", icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO nombre de más de 30 caracteres", () => assertFails(setDoc(doc(ana, "categorias/ana_20"), { nombre: "x".repeat(31), icono: "pata", color: "verde", uidUsuario: "ana" })));
  await caso("NO icono fuera del set", () => assertFails(setDoc(doc(ana, "categorias/ana_20"), { nombre: "X", icono: "<script>", color: "verde", uidUsuario: "ana" })));
  await caso("NO color fuera de la paleta", () => assertFails(setDoc(doc(ana, "categorias/ana_20"), { nombre: "X", icono: "pata", color: "#ff0000", uidUsuario: "ana" })));
  await caso("NO campos extra", () => assertFails(setDoc(doc(ana, "categorias/ana_20"), { nombre: "X", icono: "pata", color: "verde", uidUsuario: "ana", admin: true })));
  await caso("dueño lee sus categorías", () => assertSucceeds(getDocs(query(collection(ana, "categorias"), where("uidUsuario", "==", "ana")))));
  await caso("NO leer categorías ajenas", () => assertFails(getDocs(query(collection(beto, "categorias"), where("uidUsuario", "==", "ana")))));
  await caso("dueño edita su categoría", () => assertSucceeds(updateDoc(doc(ana, "categorias/AAAAAAAAAAAAAAAAAAAA"), { nombre: "Marketing", icono: "megafono", color: "azul" })));
  await caso("NO editar categoría ajena", () => assertFails(updateDoc(doc(ana, "categorias/BBBBBBBBBBBBBBBBBBBB"), { nombre: "Robada" })));
  await caso("NO cambiar el dueño de una categoría", () => assertFails(updateDoc(doc(ana, "categorias/AAAAAAAAAAAAAAAAAAAA"), { uidUsuario: "beto" })));
  await caso("NO borrar categoría ajena", () => assertFails(deleteDoc(doc(ana, "categorias/BBBBBBBBBBBBBBBBBBBB"))));
  await caso("gasto en categoría propia", () => assertSucceeds(crearGasto(ana, "gastos/c_propia", gasto("ana", { categoria: "AAAAAAAAAAAAAAAAAAAA" }))));
  await caso("NO gasto en categoría propia de OTRA persona", () => assertFails(crearGasto(ana, "gastos/c_ajena", gasto("ana", { categoria: "BBBBBBBBBBBBBBBBBBBB" }))));
  await caso("NO gasto en categoría propia que no existe", () => assertFails(crearGasto(ana, "gastos/c_nada", gasto("ana", { categoria: "ZZZZZZZZZZZZZZZZZZZZ" }))));
  await caso("gasto en una categoría propia creada en una ranura (`{uid}_{n}`)", () => assertSucceeds(crearGasto(ana, "gastos/c_ranura", gasto("ana", { categoria: "ana_1" }))));
  await caso("NO gasto en la ranura de otra persona", () => assertFails(crearGasto(beto, "gastos/c_ranura_ajena", gasto("beto", { categoria: "ana_1" }))));
  await caso("dueño borra su categoría", () => assertSucceeds(deleteDoc(doc(ana, "categorias/ana_1"))));

  console.log("Cupos por ranuras (pagos recurrentes y categorías propias):");
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "clientes/tope"), cliente("tope@prueba.test", { limites: limites({ pagosActivos: 2, categorias: 1 }) }));
  });
  const tope = env.authenticatedContext("tope").firestore();
  const cat = (extra = {}) => ({ nombre: "Gimnasio", icono: "pata", color: "verde", uidUsuario: "tope", ...extra });
  await caso("recurrente en la ranura 1 y 2 (tope 2)", async () => {
    await assertSucceeds(setDoc(doc(tope, "recurrentes/tope_1"), recurrente("tope")));
    await assertSucceeds(setDoc(doc(tope, "recurrentes/tope_2"), recurrente("tope")));
  });
  await caso("NO una tercera ranura (pasa del tope)", () => assertFails(setDoc(doc(tope, "recurrentes/tope_3"), recurrente("tope"))));
  await caso("NO id libre (auto-id) para recurrente nueva", () => assertFails(setDoc(doc(tope, "recurrentes/cualquierIdLibre"), recurrente("tope"))));
  await caso("NO ranura 0, negativa ni con ceros a la izquierda", async () => {
    await assertFails(setDoc(doc(tope, "recurrentes/tope_0"), recurrente("tope")));
    await assertFails(setDoc(doc(tope, "recurrentes/tope_-1"), recurrente("tope")));
    await assertFails(setDoc(doc(tope, "recurrentes/tope_01"), recurrente("tope")));
    await assertFails(setDoc(doc(tope, "recurrentes/tope_1_1"), recurrente("tope")));
  });
  await caso("NO usar una ranura de otra persona", () => assertFails(setDoc(doc(tope, "recurrentes/ana_9"), recurrente("tope"))));
  await caso("borrar libera la ranura: se puede volver a crear", async () => {
    await assertSucceeds(deleteDoc(doc(tope, "recurrentes/tope_2")));
    await assertSucceeds(setDoc(doc(tope, "recurrentes/tope_2"), recurrente("tope")));
  });
  await caso("categoría propia: ranura 1 sí, ranura 2 no (tope 1), id libre no", async () => {
    await assertSucceeds(setDoc(doc(tope, "categorias/tope_1"), cat()));
    await assertFails(setDoc(doc(tope, "categorias/tope_2"), cat()));
    await assertFails(setDoc(doc(tope, "categorias/AAAAAAAAAAAAAAAAAAAB"), cat()));
  });
  await caso("sin documento de plan no se crean ranuras", () => assertFails(setDoc(doc(env.authenticatedContext("nuevo").firestore(), "recurrentes/nuevo_1"), recurrente("nuevo"))));

  console.log("Recurrentes:");
  await caso("dueño crea recurrente mensual", () => assertSucceeds(setDoc(doc(ana, "recurrentes/ana_1"), recurrente("ana"))));
  await caso("crear semanal, quincenal y anual válidos", async () => {
    await assertSucceeds(setDoc(doc(ana, "recurrentes/ana_2"), recurrente("ana", { frecuencia: "semanal", dia: 5 })));
    await assertSucceeds(setDoc(doc(ana, "recurrentes/ana_3"), recurrente("ana", { frecuencia: "quincenal", dia: 0 })));
    await assertSucceeds(setDoc(doc(ana, "recurrentes/ana_4"), recurrente("ana", { frecuencia: "anual", dia: 31, mes: 12 })));
  });
  await caso("recurrente con categoría propia", () => assertSucceeds(setDoc(doc(ana, "recurrentes/ana_5"), recurrente("ana", { categoria: "AAAAAAAAAAAAAAAAAAAA" }))));
  await caso("NO crear a nombre de otro", () => assertFails(setDoc(doc(beto, "recurrentes/x1"), recurrente("ana"))));
  await caso("NO crear sin login", () => assertFails(setDoc(doc(anon, "recurrentes/x2"), recurrente("ana"))));
  await caso("NO campos extra", () => assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { admin: true }))));
  await caso("NO falta un campo", () => { const r = recurrente("ana"); delete r.activo; return assertFails(setDoc(doc(ana, "recurrentes/ana_20"), r)); });
  await caso("NO cantidad ≤ 0 ni texto ni enorme", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { cantidad: 0 })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { cantidad: "10" })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { cantidad: 1e13 })));
  });
  await caso("NO descripción vacía ni de más de 60", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { descripcion: "" })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { descripcion: "x".repeat(61) })));
  });
  await caso("NO categoría inventada ni ajena", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { categoria: "inventada" })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { categoria: "BBBBBBBBBBBBBBBBBBBB" })));
  });
  await caso("NO frecuencia desconocida", () => assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { frecuencia: "diaria" }))));
  await caso("NO día fuera de rango para su frecuencia", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { dia: 32 })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { dia: 0 })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { frecuencia: "semanal", dia: 8 })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { frecuencia: "quincenal", dia: 15 })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { frecuencia: "anual", dia: 10, mes: 0 })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { dia: 10, mes: 3 })));
  });
  await caso("NO fecha con formato inválido", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { proximaFecha: "10/11/2026" })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { proximaFecha: "2026-13-10" })));
  });
  await caso("NO `creado` falso ni `activo` como texto", async () => {
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { creado: new Date(2020, 0, 1) })));
    await assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { activo: "si" })));
  });
  await caso("NO crear con `ultimoAviso` (solo el emisor)", () => assertFails(setDoc(doc(ana, "recurrentes/ana_20"), recurrente("ana", { ultimoAviso: "2026-11-10:hoy" }))));
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
  await caso("dueño borra el suyo", () => assertSucceeds(deleteDoc(doc(ana, "recurrentes/ana_1"))));
  await caso("registrar pago: gasto con id fijo + avance de fecha en un batch", async () => {
    const { writeBatch } = require("firebase/firestore");
    const lote = writeBatch(ana);
    lote.set(doc(ana, "gastos/rec_r2_2026-11-10"), gasto("ana", { descripcion: "Nómina", categoria: "nomina" }));
    lote.set(doc(ana, "uso", claveUso("ana")), { gastos: increment(1), uidUsuario: "ana" }, { merge: true });
    lote.update(doc(ana, "recurrentes/ana_2"), { proximaFecha: "2026-11-17" });
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

  console.log("Plan, vigencia y límites:");
  await caso("sin documento de plan NO se puede registrar un gasto", () => assertFails(crearGasto(nadie, "gastos/p0", gasto("nadie"))));
  await caso("plan vencido: NO crear gasto (solo lectura)", () => assertFails(crearGasto(vera, "gastos/p1", gasto("vera"))));
  await caso("plan suspendido: NO crear gasto", () => assertFails(crearGasto(sara, "gastos/p2", gasto("sara"))));
  await caso("plan vencido: NO crear recurrente ni categoría propia", async () => {
    await assertFails(setDoc(doc(vera, "recurrentes/pv"), recurrente("vera")));
    await assertFails(setDoc(doc(vera, "categorias/VVVVVVVVVVVVVVVVVVVV"), { nombre: "X", icono: "pata", color: "verde", uidUsuario: "vera" }));
  });
  await caso("plan vencido: SÍ puede leer sus datos y su plan (descargar)", async () => {
    await assertSucceeds(getDocs(query(collection(vera, "gastos"), where("uidUsuario", "==", "vera"))));
    await assertSucceeds(getDoc(doc(vera, "clientes/vera")));
  });
  await caso("plan vencido: SÍ puede borrar lo suyo", async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "gastos/deVera"), gasto("vera")));
    await assertSucceeds(deleteDoc(doc(vera, "gastos/deVera")));
  });
  await caso("tope mensual: el 1.º y el 2.º gasto pasan, el 3.º no", async () => {
    await assertSucceeds(crearGasto(carla, "gastos/c1", gasto("carla")));
    await assertSucceeds(crearGasto(carla, "gastos/c2", gasto("carla")));
    await assertFails(crearGasto(carla, "gastos/c3", gasto("carla")));
  });
  await caso("el contador no puede saltar más de +1 ni quedarse igual", async () => {
    await assertFails(crearGasto(ana, "gastos/s1", gasto("ana"), { sumar: 2 }));
    await assertFails(crearGasto(ana, "gastos/s2", gasto("ana"), { sumar: 0 }));
  });
  await caso("sin conexión: varios gastos en cola suman bien uno por uno (increment del servidor)", async () => {
    await assertSucceeds(crearGasto(ana, "gastos/q1", gasto("ana")));
    await assertSucceeds(crearGasto(ana, "gastos/q2", gasto("ana")));
    await assertSucceeds(crearGasto(ana, "gastos/q3", gasto("ana")));
  });
  await caso("NO crear un gasto sin sumar al contador", () => assertFails(setDoc(doc(ana, "gastos/s3"), gasto("ana"))));
  await caso("NO bajar ni reiniciar el contador del mes", async () => {
    await assertFails(setDoc(doc(ana, "uso", claveUso("ana")), { gastos: 0, uidUsuario: "ana" }));
    await assertFails(deleteDoc(doc(ana, "uso", claveUso("ana"))));
  });
  await caso("NO tocar el contador de otro ni de otro mes", async () => {
    await assertFails(setDoc(doc(beto, "uso", claveUso("ana")), { gastos: 9, uidUsuario: "ana" }));
    await assertFails(setDoc(doc(ana, "uso", "ana_2020_1"), { gastos: 1, uidUsuario: "ana" }));
  });
  await caso("NO leer el contador de otra persona; el dueño y el admin sí", async () => {
    await assertFails(getDoc(doc(beto, "uso", claveUso("ana"))));
    await assertSucceeds(getDoc(doc(ana, "uso", claveUso("ana"))));
    await assertSucceeds(getDoc(doc(root, "uso", claveUso("ana"))));
    //un documento que aún no existe también se puede escuchar (la app lo hace antes del primer gasto del mes)
    await assertSucceeds(getDoc(doc(ana, "uso", "ana_2030_1")));
    await assertFails(getDoc(doc(beto, "uso", "ana_2030_1")));
  });

  console.log("Planes de clientes y super admin:");
  await caso("el cliente lee su plan; no el de otro", async () => {
    await assertSucceeds(getDoc(doc(ana, "clientes/ana")));
    await assertFails(getDoc(doc(ana, "clientes/beto")));
  });
  await caso("el cliente NO puede cambiar su plan, su vencimiento ni sus límites", async () => {
    await assertFails(updateDoc(doc(ana, "clientes/ana"), { plan: "negocio" }));
    await assertFails(setDoc(doc(ana, "clientes/ana"), cliente("ana@prueba.test", { vence: EN(3650) })));
    await assertFails(setDoc(doc(nadie, "clientes/nadie"), cliente("nadie@prueba.test")));
    await assertFails(deleteDoc(doc(ana, "clientes/ana")));
  });
  await caso("el super admin lista, crea y actualiza planes", async () => {
    await assertSucceeds(getDocs(collection(root, "clientes")));
    await assertSucceeds(setDoc(doc(root, "clientes/nuevo"), cliente("nuevo@prueba.test")));
    await assertSucceeds(setDoc(doc(root, "clientes/nuevo"), cliente("nuevo@prueba.test", { plan: "basico", limites: limites({ gastosMes: 300 }) })));
    await assertSucceeds(updateDoc(doc(root, "clientes/nuevo"), { estado: "suspendido", actualizado: serverTimestamp() }));
    //Documentos antiguos con `mesesHistorial` siguen siendo válidos (hasta volver a guardarlos); sin las 4 claves vigentes no
    await assertSucceeds(setDoc(doc(root, "clientes/antiguo"), cliente("antiguo@prueba.test", { limites: { ...limites(), mesesHistorial: 12 } })));
    await assertFails(setDoc(doc(root, "clientes/sinClave"), cliente("s@prueba.test", { limites: { gastosMes: 5, pagosActivos: 2, categorias: 1 } })));
    await assertFails(setDoc(doc(root, "clientes/extra"), cliente("e@prueba.test", { limites: { ...limites(), otraCosa: 1 } })));
    //El Worker deja `ultimoAvisoPlan` en el cliente: el admin puede seguir editándolo y esa marca no se puede falsear con otro tipo
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), "clientes/nuevo"), { ultimoAvisoPlan: "2026-11-10T04:59:59Z:3" }));
    await assertSucceeds(updateDoc(doc(root, "clientes/nuevo"), { plan: "plus", actualizado: serverTimestamp() }));
    await assertFails(updateDoc(doc(root, "clientes/nuevo"), { ultimoAvisoPlan: 5, actualizado: serverTimestamp() }));
    await assertFails(updateDoc(doc(ana, "clientes/ana"), { ultimoAvisoPlan: "x", actualizado: serverTimestamp() }));
  });
  await caso("el super admin NO puede guardar planes con datos inválidos", async () => {
    await assertFails(setDoc(doc(root, "clientes/m1"), cliente("m1@prueba.test", { plan: "gratis" })));
    await assertFails(setDoc(doc(root, "clientes/m2"), cliente("m2@prueba.test", { estado: "vencido" })));
    await assertFails(setDoc(doc(root, "clientes/m3"), cliente("m3@prueba.test", { limites: limites({ gastosMes: -1 }) })));
    await assertFails(setDoc(doc(root, "clientes/m4"), cliente("m4@prueba.test", { limites: { gastosMes: 1 } })));
    await assertFails(setDoc(doc(root, "clientes/m5"), cliente("m5@prueba.test", { admin: true })));
    await assertFails(setDoc(doc(root, "clientes/m6"), cliente("m6@prueba.test", { vence: "mañana" })));
  });
  await caso("el super admin NO lee gastos, categorías ni pagos recurrentes de los clientes", async () => {
    await assertFails(getDoc(doc(root, "gastos/deAna")));
    await assertFails(getDocs(query(collection(root, "gastos"), where("uidUsuario", "==", "ana"))));
    await assertFails(getDoc(doc(root, "recurrentes/deAna")));
  });
  await caso("nadie puede hacerse super admin desde la app", async () => {
    await assertFails(setDoc(doc(ana, "super_admins/ana"), { creado: 1 }));
    await assertFails(setDoc(doc(root, "super_admins/otro"), { creado: 1 }));
    await assertSucceeds(getDoc(doc(root, "super_admins/root")));
    await assertFails(getDoc(doc(ana, "super_admins/root")));
  });
  await caso("historial de pagos del plan: lo crea el admin, el cliente ve el suyo, nadie lo edita", async () => {
    const pago = { uidCliente: "ana", correo: "ana@prueba.test", plan: "plus", monto: 80000, referencia: "Nequi 123", fechaPago: new Date(), venceDespues: EN(30), creado: serverTimestamp() };
    await assertSucceeds(setDoc(doc(root, "pagosPlan/p1"), pago));
    await assertFails(setDoc(doc(ana, "pagosPlan/p2"), pago));
    await assertSucceeds(getDoc(doc(ana, "pagosPlan/p1")));
    await assertFails(getDoc(doc(beto, "pagosPlan/p1")));
    await assertFails(updateDoc(doc(root, "pagosPlan/p1"), { monto: 1 }));
    await assertFails(deleteDoc(doc(root, "pagosPlan/p1")));
    await assertFails(setDoc(doc(root, "pagosPlan/p3"), { ...pago, monto: -5 }));
  });

  console.log("Otras colecciones:");
  await caso("colección desconocida denegada", () => assertFails(setDoc(doc(ana, "otra/x"), { a: 1 })));

  await env.cleanup();
  console.log(`\n${ok} correctos, ${mal} fallidos`);
  process.exit(mal ? 1 : 0);
})();
