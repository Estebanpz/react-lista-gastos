import {db, doc,updateDoc} from "./../firebase/firebaseConfig";
import esperarEscritura from "./esperarEscritura";

//Devuelve "sincronizado" o "en-cola" (ver esperarEscritura)
const ActualizarGasto = (id, descripcion,cantidad,categoria, fecha) => {
    const docRef = doc(db, "gastos", id);
    return esperarEscritura(
        updateDoc(docRef, {
            descripcion: descripcion,
            cantidad: Number(cantidad),
            categoria: categoria,
            fecha: fecha,
        })
    );
}
 
export default ActualizarGasto;
