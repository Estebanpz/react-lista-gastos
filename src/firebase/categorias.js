import { db, auth } from "./firebaseConfig";
import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import esperarEscritura from "./esperarEscritura";

//Categorías propias de cada persona. Colección `categorias`: {nombre, icono, color, uidUsuario, creada}
//El id se genera en el cliente para poder usarlo de inmediato, incluso sin conexión.
export const crearCategoria = async ({ nombre, icono, color }) => {
  const referencia = doc(collection(db, "categorias"));
  const estado = await esperarEscritura(
    setDoc(referencia, { nombre: nombre.trim(), icono, color, uidUsuario: auth.currentUser.uid, creada: serverTimestamp() })
  );
  return { id: referencia.id, estado };
};

export const actualizarCategoria = (id, { nombre, icono, color }) =>
  esperarEscritura(updateDoc(doc(db, "categorias", id), { nombre: nombre.trim(), icono, color }));

export const borrarCategoria = (id) => esperarEscritura(deleteDoc(doc(db, "categorias", id)));
