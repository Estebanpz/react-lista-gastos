//Datos y mocks compartidos por las pruebas de las pantallas (no es una prueba)
import CATEGORIAS_BASE from "../functions/categorias";

export const PROPIA = { id: "AAAAAAAAAAAAAAAAAAAA", texto: "Publicidad", icono: "megafono", color: "rosa", propia: true };

export const crearContextoCategorias = (propias = []) => {
  const categorias = [...CATEGORIAS_BASE, ...propias];
  return { categorias, propias, cargando: false, porId: (id) => categorias.find((c) => c.id === id) || { id: "sin-categoria", texto: "Sin categoría", icono: "formas", color: "indigo" } };
};
