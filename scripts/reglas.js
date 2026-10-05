//Levanta SOLO el emulador de Firestore (puerto 8181) y corre scripts/probar-reglas.js
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const raiz = path.resolve(__dirname, "..");
const config = path.join(raiz, "firebase.reglas.json");
fs.writeFileSync(config, JSON.stringify({ firestore: { rules: "firestore.rules" }, emulators: { firestore: { host: "127.0.0.1", port: 8181 }, ui: { enabled: false }, singleProjectMode: true } }));
let codigo = 1;
try {
  const r = spawnSync("npx", ["firebase", "emulators:exec", "--config", "firebase.reglas.json", "--project", "demo-reglas", "--only", "firestore", "node scripts/probar-reglas.js"], { cwd: raiz, stdio: "inherit" });
  codigo = r.status === null ? 1 : r.status;
} finally {
  fs.rmSync(config, { force: true });
}
process.exit(codigo);
