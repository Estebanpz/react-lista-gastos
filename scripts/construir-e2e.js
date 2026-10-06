//Compila la app para las pruebas E2E en `build-e2e/` (nunca en `build/`, que es lo que se despliega).
//Usa credenciales de Firebase FALSAS y apunta a los emuladores locales: así una prueba jamás
//puede tocar el proyecto real, aunque exista un .env con valores verdaderos
//(las variables del entorno tienen prioridad sobre las del archivo .env).
const { execSync } = require("child_process");
const path = require("path");
const puertos = require("./puertos-e2e");

const raiz = path.resolve(__dirname, "..");

const construir = (version) => {
  const env = {
    ...process.env,
    REACT_APP_USAR_EMULADORES: "true",
    REACT_APP_EMULADOR_AUTH_PUERTO: String(puertos.auth),
    REACT_APP_EMULADOR_FIRESTORE_PUERTO: String(puertos.firestore),
    REACT_APP_VERSION: version,
    REACT_APP_API_CLIENTES: `http://127.0.0.1:${puertos.api}`,
    REACT_APP_WHATSAPP_RENOVAR: "573000000000",
    REACT_APP_FIREBASE_API_KEY: "api-key-falsa-e2e",
    REACT_APP_FIREBASE_AUTH_DOMAIN: "demo-e2e.firebaseapp.com",
    REACT_APP_FIREBASE_PROJECT_ID: "demo-e2e",
    REACT_APP_FIREBASE_STORAGE_BUCKET: "demo-e2e.appspot.com",
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    REACT_APP_FIREBASE_APP_ID: "1:000000000000:web:e2e",
    BUILD_PATH: "build-e2e",
    INLINE_RUNTIME_CHUNK: "false",
    GENERATE_SOURCEMAP: "false",
    CI: "true",
  };
  execSync("npx react-scripts build", { cwd: raiz, env, stdio: "pipe" });
};

module.exports = construir;

if (require.main === module) {
  construir(process.argv[2] || "e2e-v1");
}
