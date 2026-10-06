import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../firebase/notificaciones", () => ({
  estadoAvisos: jest.fn(),
  activarAvisos: jest.fn(),
  desactivarAvisos: jest.fn(),
  guardarPreferencias: jest.fn(),
}));
jest.mock("../firebase/firebaseConfig", () => ({ db: {}, auth: { currentUser: null }, doc: jest.fn(), getDoc: jest.fn() }));
jest.mock("../pwa/instalacion", () => ({
  detectarNavegadorIOS: () => ({ navegador: "safari", version: 17.04 }),
  puedeInstalarEnEsteIOS: () => true,
}));

import { estadoAvisos } from "../firebase/notificaciones";
import TarjetaAvisos from "../components/recurrentes/TarjetaAvisos";

describe("TarjetaAvisos en iPhone sin instalar", () => {
  beforeEach(() => estadoAvisos.mockResolvedValue("ios-sin-instalar"));

  test("explica que hay que instalar la app y abre la guía paso a paso", async () => {
    render(<TarjetaAvisos siempre />);
    expect(await screen.findByRole("heading", { name: "Instala la app para recibir avisos" })).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Ver cómo instalar" }));
    expect(screen.getByRole("dialog", { name: "Instalar en tu iPhone" })).toBeInTheDocument();
  });
});
