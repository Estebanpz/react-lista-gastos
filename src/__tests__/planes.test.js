import { PLANES, estadoCliente, textoEstado, puedeEscribir, limitesDePlan, nuevoVencimiento, finDeDiaColombia, nivelUso, porcentajeUso, claveUso, diasParaVencer } from "../functions/planes";

const DIA = 86400000;
const AHORA = Date.parse("2026-10-06T15:00:00Z");
const conVence = (dias, extra = {}) => ({ estado: "activo", vence: AHORA + dias * DIA, ...extra });

describe("catálogo de planes", () => {
  test("cada plan sube los límites del anterior (no hay uso ilimitado)", () => {
    const orden = ["prueba", "basico", "plus", "negocio"].map((id) => PLANES[id].limites);
    for (let i = 1; i < orden.length; i++) {
      Object.keys(orden[i]).forEach((k) => expect(orden[i][k]).toBeGreaterThan(orden[i - 1][k]));
    }
    expect(PLANES.prueba.precio).toBe(0);
    expect(PLANES.basico.precio).toBe(60000);
  });
});

describe("estado del cliente", () => {
  test("activo, por vencer, vencido y suspendido", () => {
    expect(estadoCliente(conVence(30), AHORA)).toBe("activo");
    expect(estadoCliente(conVence(30, { estado: "prueba" }), AHORA)).toBe("prueba");
    expect(estadoCliente(conVence(3), AHORA)).toBe("por-vencer");
    expect(estadoCliente(conVence(-1), AHORA)).toBe("vencido");
    expect(estadoCliente(conVence(30, { estado: "suspendido" }), AHORA)).toBe("suspendido");
    expect(estadoCliente(null, AHORA)).toBe("sin-plan");
  });
  test("textos para las píldoras", () => {
    expect(textoEstado(conVence(30), AHORA)).toBe("Activo");
    expect(textoEstado(conVence(3), AHORA)).toBe("Vence en 3 días");
    expect(textoEstado(conVence(0.3), AHORA)).toBe("Vence hoy");
    expect(textoEstado(conVence(1.5), AHORA)).toBe("Vence mañana");
    expect(textoEstado(conVence(-5), AHORA)).toBe("Vencido hace 5 días");
    expect(textoEstado(conVence(-0.2), AHORA)).toBe("Vencido hoy");
    expect(textoEstado(conVence(-1), AHORA)).toBe("Vencido ayer");
    expect(textoEstado(conVence(30, { estado: "suspendido" }), AHORA)).toBe("Suspendido");
  });
  test("acepta Timestamps de Firestore", () => {
    const vence = { toMillis: () => AHORA + 10 * DIA };
    expect(diasParaVencer(vence, AHORA)).toBe(10);
  });
  test("solo se puede escribir con el plan vigente y no suspendido (igual que las reglas)", () => {
    expect(puedeEscribir(conVence(2), AHORA)).toBe(true);
    expect(puedeEscribir(conVence(-1), AHORA)).toBe(false);
    expect(puedeEscribir(conVence(10, { estado: "suspendido" }), AHORA)).toBe(false);
    expect(puedeEscribir(null, AHORA)).toBe(false);
  });
});

describe("límites y vencimientos", () => {
  test("un cupo a medida reemplaza el del plan; 0 o inválido se ignora", () => {
    expect(limitesDePlan("basico", { gastosMes: 50 }).gastosMes).toBe(50);
    expect(limitesDePlan("basico", { gastosMes: 0 }).gastosMes).toBe(PLANES.basico.limites.gastosMes);
    expect(limitesDePlan("basico", { gastosMes: "x" }).gastosMes).toBe(PLANES.basico.limites.gastosMes);
    expect(limitesDePlan("inexistente").gastosMes).toBe(PLANES.prueba.limites.gastosMes);
  });
  test("renovar nunca acorta un plazo vigente y, si ya venció, cuenta desde hoy", () => {
    //siempre al cierre del día en Colombia: 23:59:59.999 (UTC-5) = 04:59:59.999 UTC del día siguiente
    const cierre = (dias) => finDeDiaColombia(AHORA + dias * DIA);
    expect(nuevoVencimiento(AHORA + 10 * DIA, 30, AHORA)).toBe(cierre(40));
    expect(nuevoVencimiento(AHORA - 5 * DIA, 30, AHORA)).toBe(cierre(30));
    expect(nuevoVencimiento(null, 30, AHORA)).toBe(cierre(30));
    expect(new Date(cierre(30)).toISOString()).toBe("2026-11-06T04:59:59.999Z");
  });
  test("barras de uso: verde, ámbar desde el 80 % y rojo al llegar al límite", () => {
    expect(nivelUso(100, 300)).toBe("ok");
    expect(nivelUso(240, 300)).toBe("aviso");
    expect(nivelUso(300, 300)).toBe("limite");
    expect(porcentajeUso(150, 300)).toBe(50);
    expect(porcentajeUso(900, 300)).toBe(100);
  });
  test("la clave del contador usa el mes de Colombia, como las reglas", () => {
    //a las 8 p. m. del último día del mes en Colombia todavía es ese mes (en UTC ya sería el siguiente)
    expect(claveUso("ana", new Date("2026-10-31T20:00:00-05:00"))).toBe("ana_2026_10");
    expect(claveUso("ana", new Date("2026-11-01T00:30:00-05:00"))).toBe("ana_2026_11");
    expect(claveUso("ana", new Date("2026-01-05T12:00:00Z"))).toBe("ana_2026_1");
  });
});
