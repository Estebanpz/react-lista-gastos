import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockOyente;
const mockAplicar = jest.fn();
jest.mock("../pwa/registroServiceWorker", () => ({
  suscribirActualizacion: (fn) => {
    mockOyente = fn;
    fn(false);
    return () => {};
  },
  aplicarActualizacion: (...args) => mockAplicar(...args),
}));

import AvisoActualizacion from "../components/AvisoActualizacion";

describe("AvisoActualizacion", () => {
  test("no se muestra mientras no haya una versión nueva", () => {
    render(<AvisoActualizacion />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("aparece cuando hay una versión nueva y «Actualizar» la aplica", () => {
    render(<AvisoActualizacion />);
    act(() => mockOyente(true));
    expect(screen.getByRole("status")).toHaveTextContent(/versión nueva/i);

    userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(mockAplicar).toHaveBeenCalledTimes(1);
  });

  test("«Más tarde» lo oculta sin aplicar la actualización", () => {
    render(<AvisoActualizacion />);
    act(() => mockOyente(true));
    userEvent.click(screen.getByRole("button", { name: "Más tarde" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mockAplicar).not.toHaveBeenCalled();
  });

  test("no roba el foco al aparecer", () => {
    render(<AvisoActualizacion />);
    act(() => mockOyente(true));
    expect(document.body).toHaveFocus();
  });
});
