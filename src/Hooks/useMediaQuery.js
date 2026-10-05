import { useEffect, useState } from "react";

//true cuando la consulta CSS coincide (se actualiza al girar o redimensionar). Ej.: useMediaQuery("(min-width: 60rem)")
const useMediaQuery = (consulta) => {
  const [coincide, cambiarCoincide] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(consulta).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const lista = window.matchMedia(consulta);
    const alCambiar = (e) => cambiarCoincide(e.matches);
    cambiarCoincide(lista.matches);
    lista.addEventListener ? lista.addEventListener("change", alCambiar) : lista.addListener(alCambiar);
    return () => (lista.removeEventListener ? lista.removeEventListener("change", alCambiar) : lista.removeListener(alCambiar));
  }, [consulta]);
  return coincide;
};

export default useMediaQuery;
