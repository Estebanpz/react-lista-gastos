//Levanta SOLO el emulador de Firestore (puerto 8182, demo-worker) y corre la prueba de integración del Worker.
//Uso: npm run test:emulador
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "worker-emulador-"));
const config = join(dir, "firebase.json");
writeFileSync(config, JSON.stringify({ emulators: { firestore: { host: "127.0.0.1", port: 8182 }, ui: { enabled: false }, singleProjectMode: true } }));
let codigo = 1;
try {
  const r = spawnSync("npx", ["firebase", "emulators:exec", "--config", config, "--project", "demo-worker", "--only", "firestore", "node --test test/emulador.test.js"], { stdio: "inherit" });
  codigo = r.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(codigo);
