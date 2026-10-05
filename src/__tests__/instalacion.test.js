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
