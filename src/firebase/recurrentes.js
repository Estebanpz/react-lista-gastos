import { db, auth } from "./firebaseConfig";
import { doc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { getUnixTime } from "date-fns";
import esperarEscritura from "./esperarEscritura";
import { siguienteFecha } from "../functions/recurrencias";
import { sumarUsoDeGasto } from "./AgregarGasto";
import { pedirRevisionSms } from "./sms";

//Pagos recurrentes (nómina, recibos, créditos…). Colección `recurrentes`:
//{descripcion, cantidad, categoria, frecuencia, dia, mes, proximaFecha (AAAA-MM-DD), activo, creado, uidUsuario}
//`ultimoAviso` lo escribe solo el Worker de recordatorios: las reglas impiden que el cliente lo toque.
//Todas las escrituras devuelven "sincronizado" o "en-cola" (ver esperarEscritura).

//Campos editables, normalizados igual que los valida firestore.rules
const campos = ({ descripcion, cantidad, categoria, frecuencia, dia, mes, proximaFecha }) => ({
  descripcion: descripcion.trim(),
  cantidad: Number(cantidad),
  categoria,
  frecuencia,
  dia: frecuencia === "quincenal" ? 0 : Number(dia),
  mes: frecuencia === "anual" ? Number(mes) : 0,
  proximaFecha,
});

//Tras un cambio ya sincronizado que puede dejar un SMS programado sin motivo, se pide revisarlo (sin esperar la respuesta)
const conRevisionSms = (promesa, proximaFecha) =>
  promesa.then((estado) => {
    if (estado === "sincronizado") pedirRevisionSms(proximaFecha);
    return estado;
  });

//El id es una ranura fija `{uid}_{n}` (ver planes.js), elegida en el cliente: sirve de inmediato, incluso sin conexión
export const crearRecurrente = async (datos, idRanura) => {
  const referencia = doc(db, "recurrentes", idRanura);
  const estado = await esperarEscritura(
    setDoc(referencia, { ...campos(datos), activo: true, creado: serverTimestamp(), uidUsuario: auth.currentUser.uid })
  );
  return { id: referencia.id, estado };
};

export const actualizarRecurrente = (id, datos) => esperarEscritura(updateDoc(doc(db, "recurrentes", id), campos(datos)));

export const pausarRecurrente = (id, activo) => (activo ? esperarEscritura(updateDoc(doc(db, "recurrentes", id), { activo })) : conRevisionSms(esperarEscritura(updateDoc(doc(db, "recurrentes", id), { activo })), null));

export const borrarRecurrente = (id) => conRevisionSms(esperarEscritura(deleteDoc(doc(db, "recurrentes", id))), null);

//Id del gasto que genera un pago: fijo por pago y vencimiento, así un doble toque, el modo sin conexión
//o dos dispositivos no crean el gasto dos veces (el segundo intento sobrescribe el mismo documento).
export const idGastoDePago = (recurrente) => `rec_${recurrente.id}_${recurrente.proximaFecha}`;

//Registra el pago como gasto (con el monto y la fecha que confirme la persona) y pasa al siguiente vencimiento.
//Las escrituras (gasto, contador de uso y nuevo vencimiento) van en un lote: o se aplican todas o ninguna.
export const registrarPago = (recurrente, { cantidad, fecha }) => {
  const lote = writeBatch(db);
  lote.set(doc(db, "gastos", idGastoDePago(recurrente)), {
    descripcion: recurrente.descripcion,
    cantidad: Number(cantidad),
    categoria: recurrente.categoria,
    fecha: getUnixTime(fecha),
    uidUsuario: auth.currentUser.uid,
  });
  sumarUsoDeGasto(lote, auth.currentUser.uid, { fijo: true }); //el gasto cuenta para el límite mensual del plan
  lote.update(doc(db, "recurrentes", recurrente.id), { proximaFecha: siguienteFecha(recurrente, recurrente.proximaFecha) });
  return conRevisionSms(esperarEscritura(lote.commit()), recurrente.proximaFecha);
};

//Salta este vencimiento sin crear gasto
export const omitirPago = (recurrente) =>
  conRevisionSms(esperarEscritura(updateDoc(doc(db, "recurrentes", recurrente.id), { proximaFecha: siguienteFecha(recurrente, recurrente.proximaFecha) })), recurrente.proximaFecha);
