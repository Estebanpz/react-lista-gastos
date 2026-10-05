import { db, getDoc, getDocFromCache, doc } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const useObtenerGasto = (id) => {
  const [gasto, cambiarGasto] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    //Bandera para no actualizar el estado si el componente ya se desmontó
    let cancelado = false;

    const obtenerGasto = async () => {
      try {
        const docRef = doc(db, "gastos", id);
        //Sin conexión se lee directo de la caché local; con conexión, del servidor
        const docSnap = navigator.onLine
          ? await getDoc(docRef)
          : await getDocFromCache(docRef);
        if (cancelado) return;

        if (docSnap.exists()) {
          cambiarGasto(docSnap.data());
        } else {
          navigate("/lista");
        }
      } catch (error) {
        //Sin conexión y sin el gasto en caché (o sin permiso): se vuelve a la lista
        console.log(error);
        if (!cancelado) navigate("/lista");
      }
    };
    obtenerGasto();

    return () => {
      cancelado = true;
      cambiarGasto('');
    };
  }, [id, navigate]);

  return [gasto, cambiarGasto];
};
export default useObtenerGasto;
