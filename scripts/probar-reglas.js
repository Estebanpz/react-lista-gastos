//Pruebas de las reglas de Firestore contra el emulador (puerto propio para no chocar con otros).
//Uso: npm run test:reglas
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

const gasto = (uid, extra = {}) => ({ descripcion: "Arriendo", cantidad: 100, categoria: "hogar", fecha: 1700000000, uidUsuario: uid, ...extra });
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

  console.log("Otras colecciones:");
  await caso("dueño guarda su token", () => assertSucceeds(setDoc(doc(ana, "usuarios/ana/tokens/t1"), { creado: 1 })));
  await caso("NO escribir token de otro", () => assertFails(setDoc(doc(beto, "usuarios/ana/tokens/t2"), { creado: 1 })));
  await caso("colección desconocida denegada", () => assertFails(setDoc(doc(ana, "otra/x"), { a: 1 })));

  await env.cleanup();
  console.log(`\n${ok} correctos, ${mal} fallidos`);
  process.exit(mal ? 1 : 0);
})();
