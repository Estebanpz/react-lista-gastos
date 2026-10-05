import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db, onSnapshot, collection, query, where } from "../firebase/firebaseConfig";
import { useAuth } from "./AuthContext";
import CATEGORIAS_BASE, { SIN_CATEGORIA } from "../functions/categorias";

const CategoriasContext = createContext({ categorias: CATEGORIAS_BASE, porId: () => SIN_CATEGORIA, cargando: false });

export const useCategorias = () => useContext(CategoriasContext);

//Une las categorías que trae la app con las propias de la persona (colección `categorias`).
//Se escucha UNA sola vez para toda la app.
export const CategoriasProvider = ({ children }) => {
  const { usuario } = useAuth();
  const [propias, cambiarPropias] = useState([]);
  const [cargando, cambiarCargando] = useState(true);

  useEffect(() => {
    if (!usuario) {
      cambiarPropias([]);
      cambiarCargando(false);
      return undefined;
    }
    const q = query(collection(db, "categorias"), where("uidUsuario", "==", usuario.uid));
    return onSnapshot(
      q,
      (snap) => {
        cambiarPropias(
          snap.docs
            .map((d) => ({ id: d.id, texto: d.data().nombre, icono: d.data().icono, color: d.data().color, propia: true }))
            .sort((a, b) => a.texto.localeCompare(b.texto, "es"))
        );
        cambiarCargando(false);
      },
      (error) => {
        console.log(error);
        cambiarCargando(false);
      }
    );
  }, [usuario]);

  const valor = useMemo(() => {
    const categorias = [...CATEGORIAS_BASE, ...propias];
    const mapa = new Map(categorias.map((c) => [c.id, c]));
    return {
      categorias,
      propias,
      cargando,
      //Si una categoría propia se borró, sus gastos antiguos se muestran como «Sin categoría»
      porId: (id) => mapa.get(id) || SIN_CATEGORIA,
    };
  }, [propias, cargando]);

  return <CategoriasContext.Provider value={valor}>{children}</CategoriasContext.Provider>;
};
