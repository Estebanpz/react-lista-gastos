import { destinoTrasLogin } from "../functions/destino";

describe("destinoTrasLogin", () => {
  test("vuelve a la página pedida", () => {
    expect(destinoTrasLogin({ desde: "/recurrentes" })).toBe("/recurrentes");
    expect(destinoTrasLogin({ desde: "/lista?x=1" })).toBe("/lista?x=1");
  });
  test.each([[undefined], [null], [{}], [{ desde: "https://malo.example" }], [{ desde: "//malo.example" }], [{ desde: "/\\malo" }], [{ desde: "/inicio-sesion" }], [{ desde: "/crear-cuenta" }], [{ desde: 5 }]])(
    "destino inválido %p → inicio",
    (estado) => expect(destinoTrasLogin(estado)).toBe("/")
  );
});
