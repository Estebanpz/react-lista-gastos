import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DialogoConfirmacion from "../components/DialogoConfirmacion";

describe("DialogoConfirmacion", () => {
  test("enfoca «Cancelar» al abrir y muestra el mensaje", () => {
    render(<DialogoConfirmacion mensaje="¿Borrar el gasto?" alConfirmar={() => {}} alCancelar={() => {}} />);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("¿Borrar el gasto?");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  test("confirmar y cancelar llaman a su callback", () => {
    const alConfirmar = jest.fn();
    const alCancelar = jest.fn();
    render(<DialogoConfirmacion mensaje="x" alConfirmar={alConfirmar} alCancelar={alCancelar} />);

    userEvent.click(screen.getByRole("button", { name: "Borrar" }));
    expect(alConfirmar).toHaveBeenCalledTimes(1);

    userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(alCancelar).toHaveBeenCalledTimes(1);
  });

  test("Escape cancela", () => {
    const alCancelar = jest.fn();
    render(<DialogoConfirmacion mensaje="x" alConfirmar={() => {}} alCancelar={alCancelar} />);
    userEvent.keyboard("{esc}");
    expect(alCancelar).toHaveBeenCalled();
  });
});
