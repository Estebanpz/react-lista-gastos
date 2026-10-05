import { armarNotificacion, destinoAlTocar, rutaSegura, OPCIONES_BASE } from "../pwa/avisos";

const fcm = (data) => ({ data, from: "123", fcmMessageId: "x" });

describe("armarNotificacion (push recibido en el service worker)", () => {
  test("un recordatorio válido arma el texto en español, sin mostrar lo recibido tal cual", () => {
    const { titulo, opciones } = armarNotificacion(fcm({ tipo: "recordatorio", cantidad: "2", url: "/recurrentes" }));
    expect(titulo).toBe("Tienes 2 pagos próximos");
    expect(opciones.body).toMatch(/registrar el pago/);
    expect(opciones.data).toEqual({ url: "/recurrentes", cantidad: 2 });
  });

  test("singular", () => {
    expect(armarNotificacion(fcm({ tipo: "recordatorio", cantidad: "1", url: "/recurrentes" })).titulo).toBe("Tienes un pago próximo");
  });

  test("el detalle opcional se limpia y se recorta", () => {
    const largo = "Nómina\ncolaboradores\u0007 " + "x".repeat(300);
    const { opciones } = armarNotificacion(fcm({ tipo: "recordatorio", cantidad: "1", detalle: largo }));
    expect(opciones.body).not.toMatch(/[\n\u0007]/);
    expect(opciones.body.length).toBeLessThanOrEqual(120);
    expect(opciones.body.startsWith("Nómina colaboradores")).toBe(true);
  });

  test.each([
    ["sin datos", null],
    ["texto suelto", "hola"],
    ["tipo desconocido", fcm({ tipo: "promo", cantidad: "1" })],
    ["cantidad inválida", fcm({ tipo: "recordatorio", cantidad: "999" })],
    ["cantidad no numérica", fcm({ tipo: "recordatorio", cantidad: "<b>" })],
  ])("%s → aviso genérico", (_, carga) => {
    const { titulo, opciones } = armarNotificacion(carga);
    expect(titulo).toBe("Finanzas");
    expect(opciones.data.url).toBe("/recurrentes");
  });

  test("una URL externa o no permitida nunca se usa", () => {
    for (const url of ["https://malo.example", "//malo.example", "/cerrar-sesion", "javascript:alert(1)"]) {
      expect(armarNotificacion(fcm({ tipo: "recordatorio", cantidad: "1", url })).opciones.data.url).toBe("/recurrentes");
      expect(rutaSegura(url)).toBe("/recurrentes");
    }
  });

  test("opciones visuales: icono, insignia, tag y español", () => {
    expect(OPCIONES_BASE).toMatchObject({ icon: "/icono-192.png", badge: "/insignia-96.png", tag: "recordatorios", lang: "es-CO" });
  });
});

describe("destinoAlTocar", () => {
  const origen = "https://finanzas.zfmanager.com";
  test("siempre del mismo origen", () => {
    expect(destinoAlTocar({ url: "/recurrentes" }, origen)).toBe(`${origen}/recurrentes`);
    expect(destinoAlTocar({ url: "https://malo.example/x" }, origen)).toBe(`${origen}/recurrentes`);
    expect(destinoAlTocar(undefined, origen)).toBe(`${origen}/recurrentes`);
  });
});
