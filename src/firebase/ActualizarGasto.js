import {db, doc,updateDoc} from "./../firebase/firebaseConfig";

const ActualizarGasto = async(id, descripcion,cantidad,categoria, fecha) => {
    const docRef = doc(db, "gastos", id);
    return await updateDoc(docRef, {
        descripcion: descripcion,
        cantidad: Number(cantidad),
        categoria: categoria,
        fecha: fecha,
    });
}
 
export default ActualizarGasto;