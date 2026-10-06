import React from "react";
import { render, screen, act } from "@testing-library/react";

let mockResolverAdmin;
let mockSnapPlan;
jest.mock("../firebase/firebaseConfig", () => ({
  db: {},
  doc: jest.fn((_, ...p) => p.join("/")),
  onSnapshot: jest.fn(),
  getDoc: jest.fn(),
}));
//El usuario debe ser siempre el mismo objeto: el contexto reescucha cuando cambia
const mockUsuario = { uid: "root" };
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ usuario: mockUsuario }) }));

import { onSnapshot, getDoc, doc } from "../firebase/firebaseConfig";
import { ClienteProvider, useCliente } from "../contexts/ClienteContext";

const Sonda = () => {
  const { cargando, esAdmin, puedeEscribir } = useCliente();
  return <p>{`cargando=${cargando} admin=${esAdmin} escribe=${puedeEscribir}`}</p>;
};

describe("ClienteContext", () => {
  beforeEach(() => {
    doc.mockImplementation((_, ...p) => p.join("/"));
    onSnapshot.mockImplementation((ruta, ok) => {
      if (ruta.startsWith("clientes/")) mockSnapPlan = ok;
      return () => {};
    });
    getDoc.mockImplementation(() => new Promise((r) => { mockResolverAdmin = r; }));
  });

  test("no da por terminada la carga hasta saber si es super admin (aunque el plan ya llegó)", async () => {
    render(<ClienteProvider><Sonda /></ClienteProvider>);
    act(() => mockSnapPlan({ exists: () => false })); //llega el (no) plan antes que la respuesta de super_admins
    expect(screen.getByText(/cargando=true/)).toBeInTheDocument();
    await act(async () => mockResolverAdmin({ exists: () => true }));
    expect(screen.getByText("cargando=false admin=true escribe=false")).toBeInTheDocument();
  });

  test("si no es super admin ni hay permiso, termina la carga como cliente", async () => {
    getDoc.mockImplementation(() => Promise.reject(new Error("permission-denied")));
    jest.spyOn(console, "log").mockImplementation(() => {});
    render(<ClienteProvider><Sonda /></ClienteProvider>);
    await act(async () => mockSnapPlan({ exists: () => false }));
    expect(await screen.findByText(/admin=false/)).toBeInTheDocument();
  });
});
