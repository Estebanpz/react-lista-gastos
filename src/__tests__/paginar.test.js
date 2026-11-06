import { paginar } from "../functions/paginar";

test("pagina de 5 en 5 y ajusta la página al rango", () => {
  const lista = [1, 2, 3, 4, 5, 6, 7];
  expect(paginar(lista, 1, 5)).toEqual({ elementos: [1, 2, 3, 4, 5], pagina: 1, paginas: 2 });
  expect(paginar(lista, 2, 5)).toEqual({ elementos: [6, 7], pagina: 2, paginas: 2 });
  expect(paginar(lista, 9, 5).pagina).toBe(2);
  expect(paginar([], 1, 5)).toEqual({ elementos: [], pagina: 1, paginas: 1 });
});
