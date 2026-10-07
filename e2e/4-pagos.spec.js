const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, irA, documentosEnEmulador, esperarServiceWorker } = require("./utilidades");

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const clave = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
//Un pago semanal que cae dentro de 3 días: así siempre aparece en «Esta semana» con «En 3 días»
const enTresDias = () => {
  const f = new Date();
  f.setDate(f.getDate() + 3);
  return f;
};

const crearPagoSemanal = async (page, descripcion, monto) => {
  const hoja = page.getByRole("dialog", { name: "Nuevo gasto fijo (pago recurrente)" });
  await hoja.getByLabel("Qué pago es").fill(descripcion);
  await hoja.getByLabel("Monto (COP)").fill(String(monto));
  //debajo del campo se muestra el valor con separador de miles, como en «Añadir gasto»
  await expect(hoja.getByText(new RegExp(`^\\$\\s?${Number(monto).toLocaleString("es-CO")}$`))).toBeVisible();
  await hoja.getByRole("radio", { name: "Nómina" }).click();
  await hoja.getByRole("radio", { name: "Semanal" }).click();
  await hoja.getByLabel("Día de la semana").selectOption({ label: DIAS[(enTresDias().getDay() + 6) % 7] });
  await hoja.getByRole("button", { name: "Guardar pago" }).click();
  await expect(hoja).toBeHidden();
};

test.describe("Pagos recurrentes", () => {
  test("crear un pago, registrarlo como gasto (una sola vez) y verlo en Inicio", async ({ page }) => {
    await registrarUsuario(page, correoUnico("pagos"));
    await expect(page.getByRole("link", { name: "Programar un gasto fijo" })).toBeVisible(); //Inicio sin pagos: nada inventado

    await irA(page, "Gastos fijos");
    await expect(page.getByRole("heading", { name: "Gastos fijos (pagos)", level: 1 })).toBeVisible();
    await expect(page.getByText("Aún no tienes gastos fijos (pagos) programados")).toBeVisible();

    await page.getByRole("button", { name: "Programar un gasto fijo" }).click();
    await crearPagoSemanal(page, "Nómina colaboradores", 1200000);

    const grupo = page.getByRole("region", { name: /Esta semana \(1\)/ });
    await expect(grupo).toContainText("Nómina colaboradores");
    await expect(grupo).toContainText("En 3 días");
    await expect(page.getByRole("region", { name: "Próximos 30 días" })).toBeVisible();

    const delPago = async () => (await documentosEnEmulador("recurrentes")).find((d) => d.descripcion === "Nómina colaboradores");
    const rec = await delPago();
    expect(rec).toMatchObject({ descripcion: "Nómina colaboradores", frecuencia: "semanal", proximaFecha: clave(enTresDias()) });

    //Registrar pago con otro monto
    await grupo.getByRole("button", { name: "Registrar pago" }).click();
    const hoja = page.getByRole("dialog", { name: "Registrar pago" });
    await hoja.getByLabel("Monto pagado (COP)").fill("1150000");
    await hoja.getByRole("button", { name: "Registrar pago" }).click();
    await expect(hoja).toBeHidden();

    const siguiente = new Date(enTresDias());
    siguiente.setDate(siguiente.getDate() + 7);
    await expect.poll(async () => (await delPago()).proximaFecha).toBe(clave(siguiente));
    const gastos = (await documentosEnEmulador("gastos")).filter((g) => g.id.startsWith(`rec_${rec.id}_`));
    expect(gastos).toHaveLength(1); //un solo gasto, con id fijo por pago y vencimiento
    expect(gastos[0]).toMatchObject({ id: `rec_${rec.id}_${rec.proximaFecha}`, descripcion: "Nómina colaboradores", categoria: "nomina" });

    //Al avanzar, el pago queda en «Más adelante»
    await expect(page.getByRole("region", { name: /Más adelante \(1\)/ })).toContainText("Nómina colaboradores");

    //Inicio muestra el pago real en «Próximos gastos fijos (pagos)»
    await irA(page, "Inicio");
    await expect(page.getByRole("region", { name: "Próximos gastos fijos (pagos)" })).toContainText("Nómina colaboradores");
  });

  test("detalle: pausar, editar y borrar con confirmación", async ({ page }) => {
    await registrarUsuario(page, correoUnico("pagos-detalle"));
    await irA(page, "Gastos fijos");
    await page.getByRole("button", { name: "Programar un gasto fijo" }).click();
    await crearPagoSemanal(page, "Recibo de energía", 212500);

    await page.getByRole("button", { name: "Recibo de energía: ver detalle" }).click();
    const detalle = page.getByLabel("Detalle del pago");
    await detalle.getByRole("button", { name: "Pausar" }).click();
    await expect(page.getByRole("region", { name: /Pausados \(1\)/ })).toContainText("Recibo de energía");

    await detalle.getByRole("button", { name: "Editar" }).click();
    const hoja = page.getByRole("dialog", { name: "Editar gasto fijo" });
    await hoja.getByLabel("Qué pago es").fill("Recibo de luz");
    await hoja.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(hoja).toBeHidden();
    await expect(page.getByRole("region", { name: /Pausados/ })).toContainText("Recibo de luz");

    await detalle.getByRole("button", { name: "Borrar" }).click();
    const confirmar = page.getByRole("alertdialog", { name: "¿Borrar este pago?" });
    await confirmar.getByRole("button", { name: /^borrar$/i }).click();
    await expect(page.getByText("Aún no tienes gastos fijos (pagos) programados")).toBeVisible();
    await expect.poll(async () => (await documentosEnEmulador("recurrentes")).some((d) => d.descripcion === "Recibo de luz")).toBe(false);
  });

  test("un push real llega al service worker y muestra el aviso con texto propio y seguro", async ({ page, context }) => {
    await context.grantPermissions(["notifications"]);
    await registrarUsuario(page, correoUnico("push"));
    await esperarServiceWorker(page);

    //Chrome sin interfaz cierra las notificaciones casi al instante: se registran desde dentro del service worker
    const [sw] = context.serviceWorkers().length ? context.serviceWorkers() : [await context.waitForEvent("serviceworker")];
    await sw.evaluate(() => {
      self.__avisos = [];
      const original = self.registration.showNotification.bind(self.registration);
      self.registration.showNotification = (titulo, opciones) => {
        self.__avisos.push({ titulo, cuerpo: opciones.body, tag: opciones.tag, url: opciones.data && opciones.data.url, icono: opciones.icon });
        return original(titulo, opciones);
      };
    });
    const avisos = () => sw.evaluate(() => self.__avisos);

    const cdp = await context.newCDPSession(page);
    const registros = [];
    cdp.on("ServiceWorker.workerRegistrationUpdated", (e) => registros.push(...e.registrations));
    await cdp.send("ServiceWorker.enable");
    await expect.poll(() => registros.find((r) => !r.isDeleted)).toBeTruthy();
    const { registrationId } = registros.find((r) => !r.isDeleted);
    const origin = new URL(page.url()).origin;

    //Formato que entrega FCM para un mensaje solo con `data`
    await cdp.send("ServiceWorker.deliverPushMessage", { origin, registrationId, data: JSON.stringify({ data: { tipo: "recordatorio", cantidad: "2", url: "/recurrentes" }, from: "e2e" }) });
    await expect.poll(avisos).toEqual([expect.objectContaining({ titulo: "Tienes 2 pagos próximos", tag: "recordatorios", url: "/recurrentes", icono: "/icono-192.png" })]);

    //Un mensaje con contenido y enlace ajenos se muestra genérico y sin el enlace
    await cdp.send("ServiceWorker.deliverPushMessage", { origin, registrationId, data: JSON.stringify({ data: { tipo: "<script>", cantidad: "1", url: "https://malo.example" } }) });
    await expect.poll(async () => (await avisos())[1]).toEqual(expect.objectContaining({ titulo: "Finanzas", url: "/recurrentes" }));
  });
});
