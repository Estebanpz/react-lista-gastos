import { useState, useEffect } from "react";
import {
  db,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "../firebase/firebaseConfig";
import { useAuth } from "../contexts/AuthContext";

const useObtenerGastos = () => {
  const [gastos, cambiarGastos] = useState([]);
  const [ultimoGasto, cambiarUltimoGasto] = useState(null);
  const [hayMasPorCargar, cambiarHayMasPorCargar] = useState(false);

  const { usuario } = useAuth();

  const obtenerMasGastos = async () => {
    const q = query(
      collection(db, "gastos"),
      where("uidUsuario", "==", usuario.uid),
      orderBy("fecha", "desc"),
      limit(10),
      startAfter(ultimoGasto)
    );

    onSnapshot(q, (snapshot) => {
      if (snapshot.docs.length > 0) {
        cambiarUltimoGasto(snapshot.docs[snapshot.docs.length - 1]);
        cambiarGastos(
          gastos.concat(
            snapshot.docs.map((gasto) => {
              return {
                id: gasto.id,
                ...gasto.data(),
              };
            })
          )
        );
      } else {
        cambiarHayMasPorCargar(false);
      }
    }, (error) =>{
      console.log(error);
    });
  };

  useEffect(() => {
    const q = query(
      collection(db, "gastos"),
      where("uidUsuario", "==", usuario.uid),
      orderBy("fecha", "desc"),
      limit(10)
    );

    const unsubcribe = onSnapshot(q, (snapshot) => {
      if (snapshot.docs.length > 0) {
        cambiarUltimoGasto(snapshot.docs[snapshot.docs.length - 1]);
        cambiarHayMasPorCargar(true);
      } else {
        cambiarHayMasPorCargar(false);
      }

      const gastos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      cambiarGastos(gastos);
    });

    return () => unsubcribe();
  }, [usuario]);

  return [gastos, obtenerMasGastos, hayMasPorCargar];
};
export default useObtenerGastos;
