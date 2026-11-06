import { normalizarCelular, aGsm7, textoSms, remitenteSms, subidSms, enVentanaDeCancelacion, LARGO_SMS } from "../functions/sms";

describe("SMS de recordatorio", () => {
  test("normaliza celulares de Colombia y rechaza lo demás", () => {
    expect(normalizarCelular("300 123 4567")).toBe("+573001234567");
    expect(normalizarCelular("+57 300-123-4567")).toBe("+573001234567");
    expect(normalizarCelular("573001234567")).toBe("+573001234567");
    for (const malo of ["", "300123456", "6011234567", "+1 300 123 4567", null]) expect(normalizarCelular(malo)).toBeNull();
  });
  test("GSM-7: quita tildes y emojis, conserva la ñ", () => {
    expect(aGsm7("Pensión Año 🎉 Ñandú")).toBe("Pension Año Ñandu");
  });
  test("texto genérico, con detalle y recortado; nunca pasa de 160", () => {
    expect(textoSms([{ descripcion: "Arriendo" }], false)).toBe("Hoy vence 1 gasto fijo en Finanzas. Registralo en finanzas.zfmanager.com/recurrentes");
    expect(textoSms([{ descripcion: "a" }, { descripcion: "b" }], false)).toBe("Hoy vencen 2 gastos fijos en Finanzas. Registralos en finanzas.zfmanager.com/recurrentes");
    expect(textoSms([{ descripcion: "Pensión" }], true)).toBe("Hoy vence tu gasto fijo Pension. Registralo en finanzas.zfmanager.com/recurrentes");
    const largo = textoSms([{ descripcion: "x".repeat(200) }, { descripcion: "y" }], true);
    expect(largo.length).toBeLessThanOrEqual(LARGO_SMS);
    expect(largo).toContain("...");
  });
  test("remitente con el nombre del cliente (11 letras o números) o «Finanzas»", () => {
    expect(remitenteSms("Esteban Páez")).toBe("EstebanPaez");
    expect(remitenteSms("María José Rodríguez")).toBe("MariaJoseRo");
    expect(remitenteSms("")).toBe("Finanzas");
    expect(remitenteSms(undefined)).toBe("Finanzas");
  });
  test("subid de 20 caracteres como máximo y ventana de cancelación de 8:00 a 8:30", () => {
    expect(subidSms("abcdefghijklmnopqrstuvwxyz12", "2026-11-10")).toBe("fabcdefghijk20261110");
    expect(subidSms("abcdefghijklmnopqrstuvwxyz12", "2026-11-10").length).toBe(20);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T12:59:00Z"))).toBe(false);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T13:00:00Z"))).toBe(true);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T13:29:00Z"))).toBe(true);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T13:30:00Z"))).toBe(false);
  });
});
