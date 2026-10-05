const mockMensajeria = {
  isSupported: jest.fn(),
  getMessaging: jest.fn(),
  getToken: jest.fn(),
  deleteToken: jest.fn(),
};
jest.mock("firebase/messaging", () => ({
  isSupported: (...a) => mockMensajeria.isSupported(...a),
  getMessaging: (...a) => mockMensajeria.getMessaging(...a),
  getToken: (...a) => mockMensajeria.getToken(...a),
  deleteToken: (...a) => mockMensajeria.deleteToken(...a),
}));
jest.mock("../firebase/firebaseConfig", () => ({ app: {}, db: {}, auth: { currentUser: { uid: "ana" } } }));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((...p) => p.slice(1).join("/")),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "ahora"),
}));

import { createHash } from "crypto";
import { TextEncoder } from "util";
global.TextEncoder = TextEncoder; //jsdom (Jest 27) no lo trae; los navegadores sí

const TOKEN = "t".repeat(160);
const ID = createHash("sha256").update(TOKEN).digest("hex");
const suscripcion = { unsubscribe: jest.fn() };
const registro = { pushManager: { getSubscription: jest.fn() } };

let modulo;
let fs;
beforeEach(() => {
  jest.resetModules();
  fs = require("firebase/firestore"); //la misma instancia simulada que usará el módulo recién cargado
  process.env.REACT_APP_FIREBASE_VAPID_KEY = "vapid-publica";
  localStorage.clear();
  mockMensajeria.isSupported.mockResolvedValue(true);
  mockMensajeria.getMessaging.mockReturnValue({});
  mockMensajeria.getToken.mockResolvedValue(TOKEN);
  mockMensajeria.deleteToken.mockResolvedValue(true);
  fs.doc.mockImplementation((...p) => p.slice(1).join("/"));
  fs.setDoc.mockResolvedValue();
  fs.deleteDoc.mockResolvedValue();
  fs.serverTimestamp.mockReturnValue("ahora");
  suscripcion.unsubscribe.mockResolvedValue(true);
  registro.pushManager.getSubscription.mockResolvedValue(suscripcion);
  window.Notification = { permission: "default", requestPermission: jest.fn().mockResolvedValue("granted") };
  window.PushManager = function PushManager() {};
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve(registro), getRegistration: jest.fn().mockResolvedValue(registro) } });
  Object.defineProperty(global, "crypto", {
    configurable: true,
    value: { subtle: { digest: async (_, datos) => createHash("sha256").update(Buffer.from(datos)).digest() } },
  });
  jest.spyOn(console, "log").mockImplementation(() => {});
  modulo = require("../firebase/notificaciones");
});
afterEach(() => console.log.mockRestore());

describe("notificaciones", () => {
  test("disponible antes de activar; activo después", async () => {
    expect(await modulo.estadoAvisos()).toBe("disponible");
    expect(await modulo.activarAvisos({ detalleEnAviso: false })).toBe("activo");
    window.Notification.permission = "granted";
    expect(await modulo.estadoAvisos()).toBe("activo");
  });

  test("activar: pide permiso, obtiene el token con la VAPID y el SW de la app, y lo guarda con id = SHA-256", async () => {
    await modulo.activarAvisos({ detalleEnAviso: true });
    expect(window.Notification.requestPermission).toHaveBeenCalled();
    expect(mockMensajeria.getToken).toHaveBeenCalledWith({}, { vapidKey: "vapid-publica", serviceWorkerRegistration: registro });
    expect(fs.setDoc).toHaveBeenCalledWith(`usuarios/ana/tokens/${ID}`, expect.objectContaining({ token: TOKEN, actualizado: "ahora" }));
    expect(fs.setDoc).toHaveBeenCalledWith("usuarios/ana", expect.objectContaining({ detalleEnAviso: true, actualizado: "ahora", zona: expect.any(String) }));
    //en el dispositivo solo queda el hash, nunca el token
    expect(localStorage.getItem("avisos:dispositivo:v1")).toContain(ID);
    expect(localStorage.getItem("avisos:dispositivo:v1")).not.toContain(TOKEN);
  });

  test("si la persona niega el permiso no se pide token", async () => {
    window.Notification.requestPermission.mockResolvedValue("denied");
    expect(await modulo.activarAvisos()).toBe("denegado");
    expect(mockMensajeria.getToken).not.toHaveBeenCalled();
  });

  test("estado denegado y no soportado", async () => {
    window.Notification.permission = "denied";
    expect(await modulo.estadoAvisos()).toBe("denegado");
    mockMensajeria.isSupported.mockResolvedValue(false);
    expect(await modulo.estadoAvisos()).toBe("no-soportado");
  });

  test("desactivar: borra el documento, el token de FCM y la suscripción del navegador", async () => {
    await modulo.activarAvisos();
    await modulo.desactivarAvisos();
    expect(fs.deleteDoc).toHaveBeenCalledWith(`usuarios/ana/tokens/${ID}`);
    expect(mockMensajeria.deleteToken).toHaveBeenCalled();
    expect(suscripcion.unsubscribe).toHaveBeenCalled();
    expect(localStorage.getItem("avisos:dispositivo:v1")).toBeNull();
  });

  test("desactivar sin conexión no se cuelga: la suscripción se da de baja igual", async () => {
    await modulo.activarAvisos();
    fs.deleteDoc.mockReturnValue(new Promise(() => {})); //nunca confirma
    mockMensajeria.deleteToken.mockRejectedValue(new Error("offline"));
    await modulo.desactivarAvisos();
    expect(suscripcion.unsubscribe).toHaveBeenCalled();
  }, 10000);

  test("refrescar guarda el token nuevo y borra el anterior si FCM lo cambió", async () => {
    await modulo.activarAvisos();
    window.Notification.permission = "granted";
    fs.setDoc.mockClear();
    const NUEVO = "n".repeat(160);
    mockMensajeria.getToken.mockResolvedValue(NUEVO);
    await modulo.refrescarAvisos();
    const idNuevo = createHash("sha256").update(NUEVO).digest("hex");
    expect(fs.setDoc).toHaveBeenCalledWith(`usuarios/ana/tokens/${idNuevo}`, expect.objectContaining({ token: NUEVO }));
    expect(fs.deleteDoc).toHaveBeenCalledWith(`usuarios/ana/tokens/${ID}`);
  });
});
