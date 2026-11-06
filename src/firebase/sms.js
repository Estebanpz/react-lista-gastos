import { db, auth } from "./firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import esperarEscritura from "./esperarEscritura";
import { zonaHoraria } from "./notificaciones";
import { urlApiClientes } from "./crearCliente";
import { hoyEnZona, ZONA_POR_DEFECTO } from "../functions/recurrencias";
import { enVentanaDeCancelacion } from "../functions/sms";

//Celular y preferencia de SMS en el perfil (usuarios/{uid}), con merge para no borrar lo de los avisos push.
//`celular` vacío = no se escribe: nunca se manda undefined a Firestore.
export const guardarSms = (uid, { celular, smsActivo, detalleEnAviso }) => {
  const datos = { zona: zonaHoraria(), detalleEnAviso: Boolean(detalleEnAviso), smsActivo: Boolean(smsActivo), actualizado: serverTimestamp() };
  if (celular) datos.celular = celular;
  return esperarEscritura(setDoc(doc(db, "usuarios", uid), datos, { merge: true }));
};

//Si quedó un SMS programado para las 8:30 y la persona acaba de registrar, omitir, pausar o borrar un gasto fijo que vencía
//hoy, se pide al Worker que lo cancele (solo él tiene las credenciales de LabsMobile). Solo entre las 8:00 y las 8:30 de
//Colombia: antes no hay nada programado y después el SMS ya salió. `proximaFecha` null = no se sabe (pausar, borrar). Nunca lanza.
export const pedirRevisionSms = async (proximaFecha) => {
  const base = urlApiClientes();
  if (!base || !auth.currentUser || !enVentanaDeCancelacion(new Date())) return;
  if (proximaFecha && proximaFecha !== hoyEnZona(ZONA_POR_DEFECTO)) return;
  try {
    const token = await auth.currentUser.getIdToken();
    await fetch(`${base}/sms/revisar`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
  } catch (e) {
    console.log(e);
  }
};
