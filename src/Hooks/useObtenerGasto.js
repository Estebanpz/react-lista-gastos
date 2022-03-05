import { db, getDoc, doc } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const useObtenerGasto = (id) => {
  const [gasto, cambiarGasto] = useState('');
  const navigate = useNavigate();
  
  const obtenerGasto = async () => {
    const docRef = doc(db, "gastos", id);
    let docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      cambiarGasto(docSnap.data());
    } else {
      navigate("/lista");
    }
  };
  useEffect(() => {
    obtenerGasto();

    return () => {
      cambiarGasto('');
    };
  }, [id]);

  return [gasto, cambiarGasto];
};
export default useObtenerGasto;
