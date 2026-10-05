const mockDesactivar = jest.fn();
jest.mock("../firebase/notificaciones", () => ({ desactivarAvisos: (...a) => mockDesactivar(...a) }));
jest.mock("../firebase/firebaseConfig", () => ({
  auth: { id: "auth" },
  db: { id: "db" },
  terminate: jest.fn(),
  signOut: jest.fn(),
  clearIndexedDbPersistence: jest.fn(),
}));

import cerrarSesion from "../firebase/cerrarSesion";
import * as config from "../firebase/firebaseConfig";

describe("cerrarSesion", () => {
  const original = window.location;
  let llamadas;

  beforeEach(() => {
    //CRA resetea los mocks entre pruebas (resetMocks: true), por eso se definen aquí
    llamadas = [];
    mockDesactivar.mockImplementation(async () => { llamadas.push("avisos"); });
    config.terminate.mockImplementation(async () => { llamadas.push("terminate"); });
    config.signOut.mockImplementation(async () => { llamadas.push("signOut"); });
    config.clearIndexedDbPersistence.mockImplementation(async () => { llamadas.push("clear"); });
    delete window.location;
    window.location = { assign: jest.fn() };
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    window.location = original;
    console.log.mockRestore();
  });

  test("quita los avisos del dispositivo, termina Firestore, cierra sesión, borra la caché y recarga (en ese orden)", async () => {
    await cerrarSesion();
    expect(llamadas).toEqual(["avisos", "terminate", "signOut", "clear"]);
    expect(window.location.assign).toHaveBeenCalledWith("/inicio-sesion");
  });

  test("si no se puede borrar la caché (otra pestaña abierta) igual redirige", async () => {
    config.clearIndexedDbPersistence.mockRejectedValueOnce(new Error("failed-precondition"));
    await cerrarSesion();
    expect(window.location.assign).toHaveBeenCalledWith("/inicio-sesion");
  });

  test("si quitar los avisos falla, igual cierra la sesión", async () => {
    mockDesactivar.mockRejectedValueOnce(new Error("sin red"));
    await cerrarSesion();
    expect(llamadas).toEqual(["terminate", "signOut", "clear"]);
    expect(window.location.assign).toHaveBeenCalledWith("/inicio-sesion");
  });

  test("si signOut falla igual redirige", async () => {
    config.signOut.mockRejectedValueOnce(new Error("fallo"));
    await cerrarSesion();
    expect(window.location.assign).toHaveBeenCalledWith("/inicio-sesion");
  });
});
