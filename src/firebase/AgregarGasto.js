import {db } from "./firebaseConfig";
import { collection, addDoc } from "firebase/firestore";


const agregarGasto = async(descripcion,cantidad,categoria, fecha, uid) =>{
    
    const docRef = await addDoc(collection(db, "gastos"),{
        descripcion: descripcion,
        cantidad: Number(cantidad),
        categoria: categoria,
        fecha: fecha,
        uidUsuario: uid
    });
    console.log(docRef);
}
export default agregarGasto;