//Página `pagina` (desde 1) de `lista`, de `tam` elementos. La página se ajusta al rango. Devuelve {elementos, pagina, paginas}.
export const paginar = (lista, pagina, tam) => {
  const paginas = Math.max(1, Math.ceil(lista.length / tam));
  const actual = Math.min(Math.max(1, pagina), paginas);
  return { elementos: lista.slice((actual - 1) * tam, actual * tam), pagina: actual, paginas };
};
