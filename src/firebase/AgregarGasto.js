import { db } from "./firebaseConfig";
import { collection, doc, writeBatch, increment } from "firebase/firestore";
import esperarEscritura from "./esperarEscritura";
import { claveUso } from "../functions/planes";

//Cada gasto nuevo suma +1 al contador de uso del mes en el MISMO lote: así las reglas de Firestore pueden
//hacer cumplir el límite de gastos del plan (ver firestore.rules → cupoDeGastos).
//El +1 lo calcula el servidor (`increment`), no el dispositivo: los gastos registrados sin conexión se
//sincronizan después uno por uno y cada uno suma sobre el valor real, sin chocar entre sí ni entre dispositivos.
//Devuelve "sincronizado" o "en-cola" (ver esperarEscritura)
export const sumarUsoDeGasto = (lote, uid) => lote.set(doc(db, "uso", claveUso(uid)), { gastos: increment(1), uidUsuario: uid }, { merge: true });

const agregarGasto = (descripcion, cantidad, categoria, fecha, uid) => {
    const lote = writeBatch(db);
    lote.set(doc(collection(db, "gastos")), {
        descripcion: descripcion,
        cantidad: Number(cantidad),
        categoria: categoria,
        fecha: fecha,
        uidUsuario: uid
    });
    sumarUsoDeGasto(lote, uid);
    return esperarEscritura(lote.commit());
};
export default agregarGasto;
