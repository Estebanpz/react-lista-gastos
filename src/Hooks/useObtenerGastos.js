import { useState, useEffect } from "react";
import {
  db,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "../firebase/firebaseConfig";
import { useAuth } from "../contexts/AuthContext";

//Cuántos gastos se cargan por página
const TAMANO_PAGINA = 10;

const useObtenerGastos = () => {
  const [gastos, cambiarGastos] = useState([]);
  const [limiteActual, cambiarLimiteActual] = useState(TAMANO_PAGINA);
  const [hayMasPorCargar, cambiarHayMasPorCargar] = useState(false);

  const { usuario } = useAuth();

  //Cargar más = ampliar el límite de la consulta. Así hay un único listener
  //activo, siempre se cierra al desmontar y la lista nunca queda desactualizada
  const obtenerMasGastos = () => {
    cambiarLimiteActual((limite) => limite + TAMANO_PAGINA);
  };

  useEffect(() => {
    if (!usuario) return;

    const q = query(
      collection(db, "gastos"),
      where("uidUsuario", "==", usuario.uid),
      orderBy("fecha", "desc"),
      limit(limiteActual)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        //Si llegaron tantos documentos como el límite, puede haber más
        cambiarHayMasPorCargar(snapshot.docs.length === limiteActual);
        cambiarGastos(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      },
      (error) => {
        console.log(error);
      }
    );

    return () => unsubscribe();
  }, [usuario, limiteActual]);

  return [gastos, obtenerMasGastos, hayMasPorCargar];
};
export default useObtenerGastos;
