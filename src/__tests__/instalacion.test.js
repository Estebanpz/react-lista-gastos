const cargarModulo = () => {
  let modulo;
  jest.isolateModules(() => {
    modulo = require("../pwa/instalacion");
  });
  return modulo;
};

const eventoInstalacion = (resultado = "accepted") => {
  const evento = new Event("beforeinstallprompt", { cancelable: true });
  evento.prompt = jest.fn();
  evento.userChoice = Promise.resolve({ outcome: resultado });
  return evento;
};

describe("instalacion", () => {
  test("guarda el evento beforeinstallprompt y evita el aviso automático", () => {
    const { suscribirInstalacion } = cargarModulo();
    const oyente = jest.fn();
    suscribirInstalacion(oyente);
    expect(oyente).toHaveBeenLastCalledWith({ puedeInstalar: false, instalada: false });

    const evento = eventoInstalacion();
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(oyente).toHaveBeenLastCalledWith({ puedeInstalar: true, instalada: false });
  });

  test("instalar() abre el diálogo nativo y devuelve la decisión", async () => {
    const { instalar } = cargarModulo();
    const evento = eventoInstalacion("accepted");
    window.dispatchEvent(evento);
    await expect(instalar()).resolves.toBe("accepted");
    expect(evento.prompt).toHaveBeenCalledTimes(1);
  });

  test("el evento solo sirve una vez", async () => {
    const { instalar } = cargarModulo();
    window.dispatchEvent(eventoInstalacion());
    await instalar();
    await expect(instalar()).resolves.toBe("no-disponible");
  });

  test("sin evento disponible, instalar() devuelve «no-disponible»", async () => {
    const { instalar } = cargarModulo();
    await expect(instalar()).resolves.toBe("no-disponible");
  });

  test("appinstalled marca la app como instalada", () => {
    const { suscribirInstalacion } = cargarModulo();
    const oyente = jest.fn();
    suscribirInstalacion(oyente);
    window.dispatchEvent(new Event("appinstalled"));
    expect(oyente).toHaveBeenLastCalledWith({ puedeInstalar: false, instalada: true });
  });
});

describe("detectarNavegadorIOS", () => {
  const UA = {
    safari17: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    safari26: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
    chrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.6167.138 Mobile/15E148 Safari/604.1",
    chromeViejo: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/110.0 Mobile/15E148 Safari/604.1",
    firefox: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/122.0 Mobile/15E148 Safari/605.1.15",
    edge: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 EdgiOS/120.0 Mobile/15E148 Safari/605.1.15",
    instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0 (iPhone14,2; iOS 17_4)",
    webview: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  };

  test.each([
    ["safari17", "safari", 17.04],
    ["safari26", "safari", 18.06],
    ["chrome", "chrome", 17.02],
    ["firefox", "firefox", 17],
    ["edge", "edge", 16.04],
    ["instagram", "integrado", 17.04],
    ["webview", "integrado", 17.04],
  ])("%s → %s", (clave, navegador, version) => {
    const { detectarNavegadorIOS } = cargarModulo();
    const r = detectarNavegadorIOS(UA[clave]);
    expect(r.navegador).toBe(navegador);
    expect(r.version).toBeCloseTo(version, 2);
  });

  test("se puede instalar desde Safari, desde Chrome/Firefox/Edge con iOS 16.4 o más, y no desde otros", () => {
    const { detectarNavegadorIOS, puedeInstalarEnEsteIOS } = cargarModulo();
    expect(puedeInstalarEnEsteIOS(detectarNavegadorIOS(UA.safari17))).toBe(true);
    expect(puedeInstalarEnEsteIOS(detectarNavegadorIOS(UA.chrome))).toBe(true);
    expect(puedeInstalarEnEsteIOS(detectarNavegadorIOS(UA.firefox))).toBe(true);
    expect(puedeInstalarEnEsteIOS(detectarNavegadorIOS(UA.edge))).toBe(true);
    expect(puedeInstalarEnEsteIOS(detectarNavegadorIOS(UA.chromeViejo))).toBe(false); //iOS 15
    expect(puedeInstalarEnEsteIOS(detectarNavegadorIOS(UA.instagram))).toBe(false);
  });

  test("iPadOS que se presenta como Mac (sin versión de iOS) se considera moderno", () => {
    const { puedeInstalarEnEsteIOS } = cargarModulo();
    expect(puedeInstalarEnEsteIOS({ navegador: "chrome", version: null })).toBe(true);
  });
});
