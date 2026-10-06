import { db, auth } from "./firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

//Todos los gastos de la persona (no solo el mes visible). Siempre se puede, aunque el plan haya vencido:
//los datos son suyos y las reglas nunca bloquean la lectura.
export const obtenerTodosLosGastos = async () => {
  const instantanea = await getDocs(query(collection(db, "gastos"), where("uidUsuario", "==", auth.currentUser.uid)));
  return instantanea.docs.map((d) => d.data());
};
