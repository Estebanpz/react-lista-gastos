import { db, doc, deleteDoc } from "./firebaseConfig";
const BorrarGasto = async(id) => {
     await deleteDoc(doc(db, `gastos/${id}`));
}

export default BorrarGasto;