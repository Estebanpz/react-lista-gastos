import { useEffect, useState } from "react";
import { db, onSnapshot, collection, query, where, orderBy } from "../firebase/firebaseConfig";
import { useAuth } from "../contexts/AuthContext";

//Gastos de la persona con fecha entre `desde` y `hasta` (segundos Unix), en tiempo real y del más reciente al más antiguo.
//Usa el índice compuesto uidUsuario + fecha (firestore.indexes.json).
const useGastosRango = (desde, hasta) => {
  const { usuario } = useAuth();
  const [estado, cambiarEstado] = useState({ gastos: [], cargando: true, error: null });

  useEffect(() => {
    if (!usuario) return undefined;
    cambiarEstado((e) => ({ ...e, cargando: true }));
    const q = query(
      collection(db, "gastos"),
      where("uidUsuario", "==", usuario.uid),
      where("fecha", ">=", desde),
      where("fecha", "<=", hasta),
      orderBy("fecha", "desc")
    );
    return onSnapshot(
      q,
      (snap) => cambiarEstado({ gastos: snap.docs.map((d) => ({ id: d.id, ...d.data() })), cargando: false, error: null }),
      (error) => {
        console.log(error);
        cambiarEstado({ gastos: [], cargando: false, error });
      }
    );
  }, [usuario, desde, hasta]);

  return estado;
};

export default useGastosRango;
