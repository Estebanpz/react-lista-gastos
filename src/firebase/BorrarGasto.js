import { db, doc, deleteDoc } from "./firebaseConfig";
import esperarEscritura from "./esperarEscritura";

//Devuelve "sincronizado" o "en-cola" (ver esperarEscritura)
const BorrarGasto = (id) => {
     return esperarEscritura(deleteDoc(doc(db, `gastos/${id}`)));
}

export default BorrarGasto;
