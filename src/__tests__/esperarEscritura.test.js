import esperarEscritura from "../firebase/esperarEscritura";

describe("esperarEscritura", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("devuelve «sincronizado» si el servidor confirma a tiempo", async () => {
    const resultado = esperarEscritura(Promise.resolve("ok"), 4000);
    await expect(resultado).resolves.toBe("sincronizado");
  });

  test("devuelve «en-cola» si no hay confirmación dentro del tiempo", async () => {
    const sinRespuesta = new Promise(() => {}); //simula estar sin conexión
    const resultado = esperarEscritura(sinRespuesta, 4000);
    jest.advanceTimersByTime(4000);
    await expect(resultado).resolves.toBe("en-cola");
  });

  test("propaga el error si Firestore rechaza la escritura (p. ej. reglas)", async () => {
    const resultado = esperarEscritura(Promise.reject(new Error("permission-denied")), 4000);
    await expect(resultado).rejects.toThrow("permission-denied");
  });

  test("un rechazo tardío, después del tiempo, no genera error sin manejar", async () => {
    let rechazar;
    const tardia = new Promise((_, rej) => { rechazar = rej; });
    const resultado = esperarEscritura(tardia, 1000);
    jest.advanceTimersByTime(1000);
    await expect(resultado).resolves.toBe("en-cola");
    rechazar(new Error("tarde")); //no debe lanzar
    await Promise.resolve();
  });
});
