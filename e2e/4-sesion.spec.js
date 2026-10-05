const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, enviarGasto, irA } = require("./utilidades");

//Devuelve todo el contenido (como texto) de las bases IndexedDB de Firestore
const leerBasesFirestore = (page) =>
  page.evaluate(async () => {
    const bases = (await indexedDB.databases()).filter((d) => d.name && d.name.startsWith("firestore/"));
    const volcado = [];
    for (const { name } of bases) {
      const db = await new Promise((ok, mal) => {
        const pet = indexedDB.open(name);
        pet.onsuccess = () => ok(pet.result);
        pet.onerror = () => mal(pet.error);
      });
      for (const almacen of Array.from(db.objectStoreNames)) {
        const filas = await new Promise((ok, mal) => {
          const pet = db.transaction(almacen).objectStore(almacen).getAll();
          pet.onsuccess = () => ok(pet.result);
          pet.onerror = () => mal(pet.error);
        });
        volcado.push(JSON.stringify(filas));
      }
      db.close();
    }
    return { cantidadBases: bases.length, texto: volcado.join("\n") };
  });

test.describe("Cerrar sesión", () => {
  test("borra los gastos guardados en el dispositivo y cierra la sesión", async ({ page }) => {
    await registrarUsuario(page, correoUnico("sesion"));
    await enviarGasto(page, "GastoSecretoXYZ", 4321);
    await expect(page.getByText("¡Gasto guardado!")).toBeVisible();
    await irA(page, "Lista");
    await expect(page.getByText("GastoSecretoXYZ")).toBeVisible();

    //sanidad de la prueba: antes de salir, el dato SÍ está en el dispositivo
    const antes = await leerBasesFirestore(page);
    expect(antes.cantidadBases).toBeGreaterThan(0);
    expect(antes.texto).toContain("GastoSecretoXYZ");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    //Primero cambia la ruta (React) y poco después llega la recarga completa que borra los datos:
    //se reintenta hasta que el dato desaparezca de las bases locales (o falla por tiempo).
    await expect
      .poll(
        async () => {
          try {
            const { texto } = await leerBasesFirestore(page);
            return texto.includes("GastoSecretoXYZ") ? "sigue en el dispositivo" : "borrado";
          } catch (error) {
            return "navegando"; //la página se estaba recargando
          }
        },
        { timeout: 20_000 }
      )
      .toBe("borrado");
    await expect(page.getByRole("heading", { level: 2, name: "Iniciar sesión" })).toBeVisible();

    //y la sesión quedó cerrada: una ruta privada redirige al login
    await page.goto("/lista");
    await expect(page.getByRole("heading", { level: 2, name: "Iniciar sesión" })).toBeVisible();
  });
});
