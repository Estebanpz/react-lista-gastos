import {
  siguienteFecha, primeraFecha, hoyEnZona, estadoPago, tipoAviso, avisoPendiente, claveAviso,
  etiquetaVencimiento, diasEntre, sumarDias, diaSemanaISO,
} from "../functions/recurrencias";

const mensual = (dia, extra = {}) => ({ frecuencia: "mensual", dia, mes: 0, activo: true, proximaFecha: "2026-01-01", ...extra });

describe("fechas básicas", () => {
  it("suma días cruzando mes y año", () => {
    expect(sumarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("cuenta días entre fechas y el día de la semana ISO", () => {
    expect(diasEntre("2026-10-05", "2026-10-08")).toBe(3);
    expect(diasEntre("2026-10-05", "2026-10-03")).toBe(-2);
    expect(diaSemanaISO("2026-10-05")).toBe(1); //lunes
    expect(diaSemanaISO("2026-10-11")).toBe(7); //domingo
  });
});

describe("mensual (día fijo del mes)", () => {
  it("todos los 10", () => {
    expect(siguienteFecha(mensual(10), "2026-10-10")).toBe("2026-11-10");
    expect(siguienteFecha(mensual(10), "2026-10-03")).toBe("2026-10-10");
  });
  it("día 31 se corre al último día de los meses cortos y vuelve a 31", () => {
    expect(siguienteFecha(mensual(31), "2026-01-31")).toBe("2026-02-28");
    expect(siguienteFecha(mensual(31), "2026-02-28")).toBe("2026-03-31");
    expect(siguienteFecha(mensual(31), "2026-03-31")).toBe("2026-04-30");
  });
  it("febrero bisiesto", () => {
    expect(siguienteFecha(mensual(30), "2028-01-30")).toBe("2028-02-29");
  });
  it("cruza de año", () => {
    expect(siguienteFecha(mensual(15), "2026-12-15")).toBe("2027-01-15");
  });
});

describe("quincenal (15 y último día)", () => {
  const q = { frecuencia: "quincenal", dia: 0, mes: 0, activo: true };
  it("alterna 15 y fin de mes", () => {
    expect(siguienteFecha(q, "2026-10-01")).toBe("2026-10-15");
    expect(siguienteFecha(q, "2026-10-15")).toBe("2026-10-31");
    expect(siguienteFecha(q, "2026-10-31")).toBe("2026-11-15");
    expect(siguienteFecha(q, "2027-02-15")).toBe("2027-02-28");
  });
});

describe("semanal", () => {
  const s = (dia) => ({ frecuencia: "semanal", dia, mes: 0, activo: true });
  it("siempre cae 7 días después del mismo día de la semana", () => {
    expect(siguienteFecha(s(5), "2026-10-02")).toBe("2026-10-09"); //viernes → viernes siguiente
    expect(siguienteFecha(s(1), "2026-10-02")).toBe("2026-10-05"); //viernes → lunes
  });
  it("cruza de mes", () => {
    expect(siguienteFecha(s(5), "2026-10-30")).toBe("2026-11-06");
  });
});

describe("anual", () => {
  const a = (dia, mes) => ({ frecuencia: "anual", dia, mes, activo: true });
  it("mismo día del año siguiente", () => {
    expect(siguienteFecha(a(20, 4), "2026-04-20")).toBe("2027-04-20");
    expect(siguienteFecha(a(20, 4), "2026-01-01")).toBe("2026-04-20");
  });
  it("29 de febrero cae el 28 en año no bisiesto y el 29 en bisiesto", () => {
    expect(siguienteFecha(a(29, 2), "2026-03-01")).toBe("2027-02-28");
    expect(siguienteFecha(a(29, 2), "2027-03-01")).toBe("2028-02-29");
  });
});

describe("primeraFecha", () => {
  it("incluye hoy si hoy es el día", () => {
    expect(primeraFecha(mensual(10), "2026-10-10")).toBe("2026-10-10");
    expect(primeraFecha(mensual(10), "2026-10-11")).toBe("2026-11-10");
  });
});

describe("hoyEnZona", () => {
  it("usa la fecha local de la zona, no la UTC", () => {
    const ahora = new Date("2026-10-06T03:30:00Z"); //22:30 del 5 en Bogotá
    expect(hoyEnZona("America/Bogota", ahora)).toBe("2026-10-05");
    expect(hoyEnZona("Asia/Tokyo", ahora)).toBe("2026-10-06");
  });
  it("una zona inválida cae a Bogotá", () => {
    expect(hoyEnZona("Marte/Olimpo", new Date("2026-10-06T03:30:00Z"))).toBe("2026-10-05");
  });
});

describe("avisos (3 días antes y el mismo día)", () => {
  const rec = (extra = {}) => ({ ...mensual(10), proximaFecha: "2026-11-10", ...extra });
  it("avisa a 3 días y el mismo día, y no en otros días", () => {
    expect(tipoAviso(rec(), "2026-11-07")).toBe("antes");
    expect(tipoAviso(rec(), "2026-11-10")).toBe("hoy");
    for (const hoy of ["2026-11-06", "2026-11-08", "2026-11-09", "2026-11-11"]) expect(tipoAviso(rec(), hoy)).toBeNull();
  });
  it("un pago vencido no se vuelve a avisar", () => {
    expect(tipoAviso(rec(), "2026-11-20")).toBeNull();
  });
  it("mes corto: el pago del 31 en febrero vence el 28 y avisa el 25 y el 28", () => {
    const r = { ...mensual(31), proximaFecha: siguienteFecha(mensual(31), "2026-01-31") };
    expect(r.proximaFecha).toBe("2026-02-28");
    expect(tipoAviso(r, "2026-02-25")).toBe("antes");
    expect(tipoAviso(r, "2026-02-28")).toBe("hoy");
  });
  it("un pago pausado no avisa", () => {
    expect(tipoAviso(rec({ activo: false }), "2026-11-10")).toBeNull();
  });
  it("cada aviso se envía una sola vez", () => {
    expect(avisoPendiente(rec(), "2026-11-07")).toBe("antes");
    expect(avisoPendiente(rec({ ultimoAviso: claveAviso(rec(), "antes") }), "2026-11-07")).toBeNull();
    //haber avisado «antes» no silencia el aviso del mismo día
    expect(avisoPendiente(rec({ ultimoAviso: claveAviso(rec(), "antes") }), "2026-11-10")).toBe("hoy");
    expect(avisoPendiente(rec({ ultimoAviso: claveAviso(rec(), "hoy") }), "2026-11-10")).toBeNull();
  });
  it("tras pagar, el aviso anterior no afecta la nueva fecha", () => {
    const pagado = rec({ proximaFecha: "2026-12-10", ultimoAviso: "2026-11-10:hoy" });
    expect(avisoPendiente(pagado, "2026-12-07")).toBe("antes");
  });
});

describe("etiquetas y estado", () => {
  const rec = { frecuencia: "mensual", dia: 10, mes: 0, activo: true, proximaFecha: "2026-11-10" };
  it("estado", () => {
    expect(estadoPago(rec, "2026-11-11")).toBe("vencido");
    expect(estadoPago(rec, "2026-11-10")).toBe("hoy");
    expect(estadoPago(rec, "2026-11-05")).toBe("pronto");
    expect(estadoPago(rec, "2026-10-01")).toBe("al-dia");
  });
  it("etiqueta de vencimiento", () => {
    expect(etiquetaVencimiento(rec, "2026-11-10")).toBe("vence hoy");
    expect(etiquetaVencimiento(rec, "2026-11-09")).toBe("vence mañana");
    expect(etiquetaVencimiento(rec, "2026-11-07")).toBe("en 3 días");
    expect(etiquetaVencimiento(rec, "2026-11-11")).toBe("venció ayer");
    expect(etiquetaVencimiento(rec, "2026-11-13")).toBe("venció hace 3 días");
  });
});
