//Registro simulado: un EventTarget con las propiedades que usa el módulo
class RegistroFalso extends EventTarget {
  constructor({ waiting = null } = {}) {
    super();
    this.waiting = waiting;
    this.installing = null;
  }
  //Simula que el navegador encontró un service worker nuevo y avanza su estado
  simularNuevoServiceWorker(estadoFinal) {
    const nuevo = new EventTarget();
    nuevo.state = "installing";
    this.installing = nuevo;
    this.dispatchEvent(new Event("updatefound"));
    nuevo.state = estadoFinal;
    nuevo.dispatchEvent(new Event("statechange"));
    return nuevo;
  }
}

const cargarModulo = () => {
  let modulo;
  jest.isolateModules(() => {
    modulo = require("../pwa/registroServiceWorker");
  });
  return modulo;
};

describe("registroServiceWorker", () => {
  test("la PRIMERA instalación no se considera una actualización", () => {
    const { observarRegistro, suscribirActualizacion } = cargarModulo();
    const oyente = jest.fn();
    suscribirActualizacion(oyente);
    const registro = new RegistroFalso();
    observarRegistro(registro, false); //sin controlador previo = primera visita

    registro.simularNuevoServiceWorker("installed");
    expect(oyente).toHaveBeenLastCalledWith(false);
  });

  test("una versión nueva instalada con controlador previo avisa que hay actualización", () => {
    const { observarRegistro, suscribirActualizacion } = cargarModulo();
    const oyente = jest.fn();
    suscribirActualizacion(oyente);
    const registro = new RegistroFalso();
    observarRegistro(registro, true);

    registro.simularNuevoServiceWorker("installing"); //aún no instalado: nada
    expect(oyente).toHaveBeenLastCalledWith(false);
    registro.simularNuevoServiceWorker("installed");
    expect(oyente).toHaveBeenLastCalledWith(true);
  });

  test("si ya hay una versión en espera al abrir, avisa de inmediato", () => {
    const { observarRegistro, suscribirActualizacion } = cargarModulo();
    const oyente = jest.fn();
    suscribirActualizacion(oyente);
    observarRegistro(new RegistroFalso({ waiting: { postMessage: jest.fn() } }), true);
    expect(oyente).toHaveBeenLastCalledWith(true);
  });

  test("aplicarActualizacion envía SKIP_WAITING a la versión en espera", () => {
    const { observarRegistro, aplicarActualizacion } = cargarModulo();
    const postMessage = jest.fn();
    observarRegistro(new RegistroFalso({ waiting: { postMessage } }), true);
    aplicarActualizacion();
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  test("aplicarActualizacion no falla si no hay nada en espera", () => {
    const { observarRegistro, aplicarActualizacion } = cargarModulo();
    observarRegistro(new RegistroFalso(), true);
    expect(() => aplicarActualizacion()).not.toThrow();
  });

  test("suscribirActualizacion devuelve la función para dejar de escuchar", () => {
    const { observarRegistro, suscribirActualizacion } = cargarModulo();
    const oyente = jest.fn();
    const darDeBaja = suscribirActualizacion(oyente);
    darDeBaja();
    oyente.mockClear();
    const registro = new RegistroFalso();
    observarRegistro(registro, true);
    registro.simularNuevoServiceWorker("installed");
    expect(oyente).not.toHaveBeenCalled();
  });
});
