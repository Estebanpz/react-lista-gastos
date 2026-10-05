jest.mock("../firebase/firebaseConfig", () => ({
  auth: { id: "auth" },
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  setPersistence: jest.fn(),
  indexedDBLocalPersistence: "indexedDB",
  browserLocalPersistence: "local",
  browserSessionPersistence: "session",
}));

import * as config from "../firebase/firebaseConfig";
import { iniciarSesion, registrarUsuario, recuperarClave } from "../firebase/autenticacion";
import { mensajeInicioSesion, mensajeRegistro, mensajeRecuperar } from "../functions/mensajesAuth";

describe("autenticacion", () => {
  beforeEach(() => {
    //CRA resetea los mocks entre pruebas: se redefinen aquí
    config.setPersistence.mockResolvedValue(undefined);
    config.signInWithEmailAndPassword.mockResolvedValue({ user: { uid: "ana" } });
    config.createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: "ana" } });
    config.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  test("con «Recordarme» la sesión queda en el dispositivo (IndexedDB) y luego inicia sesión", async () => {
    const orden = [];
    config.setPersistence.mockImplementation(async (_, p) => { orden.push("persistencia:" + p); });
    config.signInWithEmailAndPassword.mockImplementation(async () => { orden.push("login"); return {}; });
    await iniciarSesion("a@b.co", "secreto1", true);
    expect(orden).toEqual(["persistencia:indexedDB", "login"]);
  });

  test("sin «Recordarme» la sesión es solo de la pestaña", async () => {
    await iniciarSesion("a@b.co", "secreto1", false);
    expect(config.setPersistence).toHaveBeenCalledWith({ id: "auth" }, "session");
  });

  test("si IndexedDB no está disponible usa localStorage como respaldo", async () => {
    config.setPersistence.mockRejectedValueOnce(new Error("sin indexedDB")).mockResolvedValue(undefined);
    await iniciarSesion("a@b.co", "secreto1", true);
    expect(config.setPersistence).toHaveBeenLastCalledWith({ id: "auth" }, "local");
    expect(config.signInWithEmailAndPassword).toHaveBeenCalled();
  });

  test("registrarUsuario aplica la misma persistencia y crea la cuenta", async () => {
    await registrarUsuario("a@b.co", "secreto1", false);
    expect(config.setPersistence).toHaveBeenCalledWith({ id: "auth" }, "session");
    expect(config.createUserWithEmailAndPassword).toHaveBeenCalledWith({ id: "auth" }, "a@b.co", "secreto1");
  });

  test("recuperarClave envía el correo de recuperación", async () => {
    await recuperarClave("a@b.co");
    expect(config.sendPasswordResetEmail).toHaveBeenCalledWith({ id: "auth" }, "a@b.co");
  });
});

describe("mensajesAuth", () => {
  test("el inicio de sesión no revela si el correo existe", () => {
    const m = mensajeInicioSesion({ code: "auth/user-not-found" });
    expect(m).toBe(mensajeInicioSesion({ code: "auth/wrong-password" }));
    expect(m).toBe(mensajeInicioSesion({ code: "auth/invalid-credential" }));
    expect(m).toMatch(/correo o contraseña incorrectos/i);
  });

  test("cada error dice qué pasó y qué hacer", () => {
    expect(mensajeInicioSesion({ code: "auth/too-many-requests" })).toMatch(/espera unos minutos/i);
    expect(mensajeInicioSesion({ code: "auth/network-request-failed" })).toMatch(/conéctate/i);
    expect(mensajeRegistro({ code: "auth/email-already-in-use" })).toMatch(/inicia sesión/i);
    expect(mensajeRegistro({ code: "auth/weak-password" })).toMatch(/6 caracteres/);
    expect(mensajeRecuperar({ code: "auth/invalid-email" })).toMatch(/revisa/i);
  });

  test("un error desconocido o sin código usa el mensaje genérico", () => {
    expect(mensajeInicioSesion({ code: "auth/algo-raro" })).toMatch(/inténtalo de nuevo/i);
    expect(mensajeRegistro(undefined)).toMatch(/inténtalo de nuevo/i);
  });
});
