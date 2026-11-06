const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, irA, documentosEnEmulador } = require("./utilidades");

test("el cliente guarda su celular y enciende el SMS del día del pago", async ({ page }) => {
  const correo = correoUnico("sms");
  await registrarUsuario(page, correo);
  await irA(page, "Gastos fijos");
  const tarjeta = page.getByRole("region", { name: "Recordatorio por SMS" });
  await tarjeta.getByLabel("Celular").fill("300 123 45");
  await tarjeta.getByRole("button", { name: "Guardar" }).click();
  await expect(tarjeta.getByText("Escribe tu celular de 10 dígitos (empieza por 3).")).toBeVisible();
  await tarjeta.getByLabel("Celular").fill("300 123 4567");
  await tarjeta.getByText("Recordarme por SMS").click();
  await tarjeta.getByRole("button", { name: "Guardar" }).click();
  await expect(tarjeta.getByText("Listo: te enviaremos el SMS el día de cada pago.")).toBeVisible();
  const perfil = (await documentosEnEmulador("usuarios")).find((p) => p.celular === "+573001234567");
  expect(perfil).toMatchObject({ smsActivo: true });
  for (const ancho of [320, 768, 1440]) { await page.setViewportSize({ width: ancho, height: 800 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); }
});
