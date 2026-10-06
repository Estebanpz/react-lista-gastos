import { db, auth } from "./firebaseConfig";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import esperarEscritura from "./esperarEscritura";

//Categorías propias de cada persona. Colección `categorias`: {nombre, icono, color, uidUsuario, creada}
//El id es una ranura fija `{uid}_{n}` (ver planes.js), elegida en el cliente: sirve de inmediato, incluso sin conexión.
export const crearCategoria = async ({ nombre, icono, color }, idRanura) => {
  const referencia = doc(db, "categorias", idRanura);
  const estado = await esperarEscritura(
    setDoc(referencia, { nombre: nombre.trim(), icono, color, uidUsuario: auth.currentUser.uid, creada: serverTimestamp() })
  );
  return { id: referencia.id, estado };
};

export const actualizarCategoria = (id, { nombre, icono, color }) =>
  esperarEscritura(updateDoc(doc(db, "categorias", id), { nombre: nombre.trim(), icono, color }));

export const borrarCategoria = (id) => esperarEscritura(deleteDoc(doc(db, "categorias", id)));
