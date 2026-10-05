import { app, db, auth } from "./firebaseConfig";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import esperarEscritura from "./esperarEscritura";

//Avisos push de pagos en ESTE dispositivo. `firebase/messaging` se carga solo cuando hace falta (import()),
//así no pesa en la carga inicial. El token del dispositivo se guarda en usuarios/{uid}/tokens/{sha256(token)}
//(las reglas exigen que el id sea el hash) y el Worker de Cloudflare lo usa para enviar los recordatorios.
//En este dispositivo solo se recuerda el id (hash), nunca el token, para poder limpiarlo al cerrar sesión.

const CLAVE_LOCAL = "avisos:dispositivo:v1";
const REFRESCO_MS = 30 * 24 * 60 * 60 * 1000; //Firebase recomienda renovar el token cada mes
const VAPID = process.env.REACT_APP_FIREBASE_VAPID_KEY;

const leerLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || null;
  } catch {
    return null;
  }
};
const guardarLocal = (valor) => {
  try {
    if (valor) localStorage.setItem(CLAVE_LOCAL, JSON.stringify(valor));
    else localStorage.removeItem(CLAVE_LOCAL);
  } catch {
    /* almacenamiento bloqueado: se sigue sin recordar */
  }
};

export const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const estaInstaladaComoApp = () =>
  (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;

const plataforma = () => {
  if (esIOS()) return "ios";
  if (/Android/i.test(navigator.userAgent)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/i.test(navigator.userAgent)) return "escritorio";
  return "otro";
};

export const sha256Hex = async (texto) => {
  const huella = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(huella)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

//Corta una promesa que puede colgarse sin conexión (p. ej. deleteToken)
const conLimite = (promesa, ms = 3000) =>
  Promise.race([promesa, new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo agotado")), ms))]);

const cargarMensajeria = async () => {
  const modulo = await import("firebase/messaging");
  return { ...modulo, mensajeria: modulo.getMessaging(app) };
};

//Qué puede hacer este dispositivo:
//  "activo" | "disponible" | "denegado" | "ios-sin-instalar" | "no-soportado"
export const estadoAvisos = async () => {
  const basico = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  if (esIOS() && !estaInstaladaComoApp()) return "ios-sin-instalar"; //en iPhone solo hay push con la app instalada
  if (!basico || !VAPID) return "no-soportado";
  try {
    const { isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return "no-soportado";
  } catch {
    return "no-soportado";
  }
  if (Notification.permission === "denied") return "denegado";
  return Notification.permission === "granted" && leerLocal() ? "activo" : "disponible";
};

const guardarToken = async (uid, token) => {
  const id = await sha256Hex(token);
  const anterior = leerLocal();
  await esperarEscritura(setDoc(doc(db, "usuarios", uid, "tokens", id), { token, plataforma: plataforma(), actualizado: serverTimestamp() }));
  //Si el token cambió, el documento viejo ya no sirve
  if (anterior && anterior.id !== id && anterior.uid === uid) {
    await esperarEscritura(deleteDoc(doc(db, "usuarios", uid, "tokens", anterior.id))).catch(() => {});
  }
  guardarLocal({ id, uid, fecha: Date.now() });
};

const zonaHoraria = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota";
  } catch {
    return "America/Bogota";
  }
};

//Perfil que lee el Worker: zona horaria (para saber qué día es «hoy») y si el aviso puede mostrar descripciones
export const guardarPreferencias = (uid, { detalleEnAviso }) =>
  esperarEscritura(setDoc(doc(db, "usuarios", uid), { zona: zonaHoraria(), detalleEnAviso: Boolean(detalleEnAviso), actualizado: serverTimestamp() }));

//Solo se llama desde un clic (los navegadores bloquean el permiso pedido sin un gesto de la persona).
//Devuelve "activo" o "denegado"; lanza un error si algo más falla.
export const activarAvisos = async ({ detalleEnAviso = false } = {}) => {
  const uid = auth.currentUser.uid;
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return "denegado";
  const { getToken, mensajeria } = await cargarMensajeria();
  const token = await getToken(mensajeria, { vapidKey: VAPID, serviceWorkerRegistration: await navigator.serviceWorker.ready });
  await guardarToken(uid, token);
  await guardarPreferencias(uid, { detalleEnAviso });
  return "activo";
};

//Renueva el token al abrir la app si pasó un mes o si FCM entregó otro (no pide permisos)
export const refrescarAvisos = async () => {
  const local = leerLocal();
  const uid = auth.currentUser && auth.currentUser.uid;
  if (!local || !uid || local.uid !== uid || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const { getToken, mensajeria } = await cargarMensajeria();
    const token = await getToken(mensajeria, { vapidKey: VAPID, serviceWorkerRegistration: await navigator.serviceWorker.ready });
    const id = await sha256Hex(token);
    if (id !== local.id || Date.now() - local.fecha > REFRESCO_MS) await guardarToken(uid, token);
  } catch (error) {
    console.log(error);
  }
};

//Deja de recibir avisos en este dispositivo. También se usa al cerrar sesión, ANTES de cerrar Firestore:
//borrar el documento necesita la sesión. Nada de esto debe impedir el cierre: cada paso tiene límite de
//tiempo y los errores solo se registran. La baja local de la suscripción funciona sin conexión; si el
//documento no alcanza a borrarse, FCM responderá UNREGISTERED y el Worker lo eliminará.
export const desactivarAvisos = async () => {
  const local = leerLocal();
  guardarLocal(null);
  const uid = auth.currentUser && auth.currentUser.uid;
  if (local && uid && local.uid === uid) {
    await esperarEscritura(deleteDoc(doc(db, "usuarios", uid, "tokens", local.id)), 2000).catch((e) => console.log(e));
  }
  if (local) {
    try {
      const { deleteToken, mensajeria } = await cargarMensajeria();
      await conLimite(deleteToken(mensajeria));
    } catch (error) {
      console.log(error);
    }
  }
  try {
    const registro = "serviceWorker" in navigator ? await conLimite(navigator.serviceWorker.getRegistration(), 2000) : null;
    const suscripcion = registro && registro.pushManager ? await registro.pushManager.getSubscription() : null;
    if (suscripcion) await suscripcion.unsubscribe();
  } catch (error) {
    console.log(error);
  }
};
