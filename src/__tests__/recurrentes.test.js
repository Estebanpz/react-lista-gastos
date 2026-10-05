const mockLote = { set: jest.fn(), update: jest.fn(), commit: jest.fn() };
jest.mock("../firebase/firebaseConfig", () => ({ db: { id: "db" }, auth: { currentUser: { uid: "ana" } } }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "col"),
  doc: jest.fn((...partes) => (partes.length === 1 ? { id: "nuevoId" } : partes.slice(1).join("/"))),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(() => "ahora"),
}));

import * as fs from "firebase/firestore";
import { crearRecurrente, registrarPago, omitirPago, idGastoDePago, actualizarRecurrente } from "../firebase/recurrentes";

const rec = { id: "r1", descripcion: "Nómina", cantidad: 1500000, categoria: "nomina", frecuencia: "mensual", dia: 31, mes: 0, proximaFecha: "2026-01-31", activo: true };

describe("firebase/recurrentes", () => {
  beforeEach(() => {
    fs.collection.mockImplementation(() => "col");
    fs.doc.mockImplementation((...partes) => (partes.length === 1 ? { id: "nuevoId" } : partes.slice(1).join("/")));
    fs.setDoc.mockResolvedValue();
    fs.updateDoc.mockResolvedValue();
    fs.writeBatch.mockReturnValue(mockLote);
    fs.serverTimestamp.mockReturnValue("ahora");
    mockLote.commit.mockResolvedValue();
  });

  test("crear normaliza los campos como las reglas (quincenal sin día, mes solo en anual)", async () => {
    const r = await crearRecurrente({ descripcion: "  Nómina  ", cantidad: "1500000", categoria: "nomina", frecuencia: "quincenal", dia: 15, mes: 4, proximaFecha: "2026-10-15" });
    expect(r).toEqual({ id: "nuevoId", estado: "sincronizado" });
    expect(fs.setDoc).toHaveBeenCalledWith({ id: "nuevoId" }, {
      descripcion: "Nómina", cantidad: 1500000, categoria: "nomina", frecuencia: "quincenal", dia: 0, mes: 0,
      proximaFecha: "2026-10-15", activo: true, creado: "ahora", uidUsuario: "ana",
    });
  });

  test("actualizar no toca activo, creado, dueño ni ultimoAviso", async () => {
    await actualizarRecurrente("r1", { ...rec, frecuencia: "anual", dia: 20, mes: 4 });
    const datos = fs.updateDoc.mock.calls[0][1];
    expect(Object.keys(datos).sort()).toEqual(["cantidad", "categoria", "descripcion", "dia", "frecuencia", "mes", "proximaFecha"]);
    expect(datos.mes).toBe(4);
  });

  test("registrar pago: gasto con id fijo + siguiente vencimiento en un solo lote", async () => {
    const fecha = new Date(2026, 0, 31, 12);
    expect(await registrarPago(rec, { cantidad: "1450000", fecha })).toBe("sincronizado");
    expect(idGastoDePago(rec)).toBe("rec_r1_2026-01-31");
    expect(mockLote.set).toHaveBeenCalledWith("gastos/rec_r1_2026-01-31", {
      descripcion: "Nómina", cantidad: 1450000, categoria: "nomina", fecha: Math.floor(fecha.getTime() / 1000), uidUsuario: "ana",
    });
    //31 de enero → el siguiente es el 28 de febrero (mes corto)
    expect(mockLote.update).toHaveBeenCalledWith("recurrentes/r1", { proximaFecha: "2026-02-28" });
    expect(mockLote.commit).toHaveBeenCalledTimes(1);
  });

  test("registrar dos veces el mismo vencimiento escribe el MISMO gasto (no duplica)", async () => {
    await registrarPago(rec, { cantidad: 1, fecha: new Date() });
    await registrarPago(rec, { cantidad: 1, fecha: new Date() });
    expect(mockLote.set.mock.calls[0][0]).toBe(mockLote.set.mock.calls[1][0]);
  });

  test("omitir avanza sin crear gasto", async () => {
    await omitirPago(rec);
    expect(fs.updateDoc).toHaveBeenCalledWith("recurrentes/r1", { proximaFecha: "2026-02-28" });
    expect(fs.writeBatch).not.toHaveBeenCalled();
  });
});
