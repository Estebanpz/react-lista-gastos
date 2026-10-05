import React from "react";
import { render, screen, act } from "@testing-library/react";
import EstadoConexion from "../components/EstadoConexion";

const ponerConexion = (valor) =>
  Object.defineProperty(window.navigator, "onLine", { value: valor, configurable: true });

describe("EstadoConexion", () => {
  afterEach(() => ponerConexion(true));

  test("no muestra nada con conexión", () => {
    ponerConexion(true);
    render(<EstadoConexion />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("muestra el aviso al iniciar sin conexión", () => {
    ponerConexion(false);
    render(<EstadoConexion />);
    expect(screen.getByRole("status")).toHaveTextContent(/sin conexión/i);
  });

  test("reacciona a los eventos offline y online", () => {
    ponerConexion(true);
    render(<EstadoConexion />);
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("quita los listeners al desmontar", () => {
    const quitar = jest.spyOn(window, "removeEventListener");
    const { unmount } = render(<EstadoConexion />);
    unmount();
    const eventos = quitar.mock.calls.map((c) => c[0]);
    expect(eventos).toEqual(expect.arrayContaining(["online", "offline"]));
    quitar.mockRestore();
  });
});
