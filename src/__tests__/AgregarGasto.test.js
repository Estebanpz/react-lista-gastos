const mockLote = { set: jest.fn(), commit: jest.fn() };
jest.mock("../firebase/firebaseConfig", () => ({ db: { id: "db" } }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "col"),
  doc: jest.fn((...p) => (p.length === 1 ? "gastos/nuevo" : p.slice(1).join("/"))),
  writeBatch: jest.fn(),
  increment: jest.fn((n) => ({ incremento: n })),
}));

import * as fs from "firebase/firestore";
import agregarGasto from "../firebase/AgregarGasto";

describe("agregarGasto", () => {
  beforeEach(() => {
    fs.collection.mockImplementation(() => "col");
    fs.doc.mockImplementation((...p) => (p.length === 1 ? "gastos/nuevo" : p.slice(1).join("/")));
    fs.writeBatch.mockReturnValue(mockLote);
    fs.increment.mockImplementation((n) => ({ incremento: n }));
    mockLote.commit.mockResolvedValue();
  });

  test("guarda el gasto y suma 1 al contador del mes en el mismo lote (el servidor hace la suma)", async () => {
    expect(await agregarGasto("  Almuerzo ", "35000", "comida", 1700000000, "ana")).toBe("sincronizado");
    expect(mockLote.set).toHaveBeenNthCalledWith(1, "gastos/nuevo", { descripcion: "  Almuerzo ", cantidad: 35000, categoria: "comida", fecha: 1700000000, uidUsuario: "ana" });
    expect(mockLote.set).toHaveBeenNthCalledWith(2, expect.stringMatching(/^uso\/ana_\d{4}_\d{1,2}$/), { gastos: { incremento: 1 }, uidUsuario: "ana" }, { merge: true });
    expect(mockLote.commit).toHaveBeenCalledTimes(1);
  });
});
