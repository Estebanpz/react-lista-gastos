const { defineConfig } = require("@playwright/test");

//Usa el Chrome instalado en el sistema (no descarga navegadores).
//Un solo worker y en orden: los archivos comparten los emuladores y el último (actualización)
//recompila la app mientras corre.
module.exports = defineConfig({
  testDir: ".",
  testMatch: "*.spec.js",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5050",
    channel: "chrome",
    headless: true,
    serviceWorkers: "allow",
    locale: "es-CO",
    viewport: { width: 1280, height: 800 },
  },
});
