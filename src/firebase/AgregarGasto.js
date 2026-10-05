import {db } from "./firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import esperarEscritura from "./esperarEscritura";

//Devuelve "sincronizado" o "en-cola" (ver esperarEscritura)
const agregarGasto = (descripcion,cantidad,categoria, fecha, uid) =>{
    return esperarEscritura(
        addDoc(collection(db, "gastos"),{
            descripcion: descripcion,
            cantidad: Number(cantidad),
            categoria: categoria,
            fecha: fecha,
            uidUsuario: uid
        })
    );
}
export default agregarGasto;
