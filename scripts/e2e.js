//Orquestador de las pruebas E2E:
//  1) compila la app (v1) en build-e2e/ con credenciales falsas y emuladores
//  2) genera firebase.e2e.json: igual que firebase.json (mismas cabeceras y CSP reales),
//     sirviendo build-e2e/ y con los emuladores de Auth, Firestore y Hosting
//  3) levanta los emuladores y ejecuta Playwright
//  4) limpia lo generado
const { spawn } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const construir = require("./construir-e2e");
const puertos = require("./puertos-e2e");

const raiz = path.resolve(__dirname, "..");
const configE2E = path.join(raiz, "firebase.e2e.json");

const real = JSON.parse(fs.readFileSync(path.join(raiz, "firebase.json"), "utf8"));
const e2e = JSON.parse(JSON.stringify(real));
e2e.hosting.public = "build-e2e";
delete e2e.hosting.predeploy;
//Única diferencia con producción: la CSP permite hablar con los emuladores locales (http),
//y se quita upgrade-insecure-requests porque convertiría esas llamadas a https.
e2e.hosting.headers = e2e.hosting.headers.map((regla) => ({
  ...regla,
  headers: regla.headers.map((cab) =>
    cab.key === "Content-Security-Policy"
      ? {
          ...cab,
          value: cab.value
            .replace("connect-src 'self'", `connect-src 'self' http://127.0.0.1:${puertos.firestore} http://127.0.0.1:${puertos.auth}`)
            .replace("; upgrade-insecure-requests", ""),
        }
      : cab
  ),
}));
e2e.emulators = {
  auth: { host: "127.0.0.1", port: puertos.auth },
  firestore: { host: "127.0.0.1", port: puertos.firestore },
  hosting: { host: "127.0.0.1", port: puertos.hosting },
  hub: { host: "127.0.0.1", port: puertos.hub },
  logging: { host: "127.0.0.1", port: puertos.logging },
  ui: { enabled: false },
  singleProjectMode: true,
};

const principal = async () => {
let codigo = 1;
try {
  console.log("Compilando la app para E2E (v1)…");
  construir("e2e-v1");
  fs.writeFileSync(configE2E, JSON.stringify(e2e, null, 2));

  const hijo = spawn(
    "npx",
    [
      "firebase", "emulators:exec",
      "--config", "firebase.e2e.json",
      "--project", "demo-e2e",
      "--only", "auth,firestore,hosting",
      `npx playwright test --config e2e/playwright.config.js ${process.argv.slice(2).join(" ")}`,
    ],
    { cwd: raiz, stdio: ["inherit", "pipe", "pipe"] }
  );
  //Se muestra toda la salida salvo el registro de cada petición del emulador de Hosting
  [hijo.stdout, hijo.stderr].forEach((flujo) =>
    readline.createInterface({ input: flujo }).on("line", (linea) => {
      if (!/^i {2}hosting: 127\.0\.0\.1 - - \[/.test(linea)) console.log(linea);
    })
  );
  codigo = await new Promise((resolver) => hijo.on("close", (c) => resolver(c === null ? 1 : c)));
} finally {
  fs.rmSync(configE2E, { force: true });
  fs.rmSync(path.join(raiz, "build-e2e"), { recursive: true, force: true });
}
process.exit(codigo);
};

principal();
