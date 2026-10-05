import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Hoja from "../components/Hoja";

const Prueba = ({ alCerrar = () => {} }) => {
  const [abierta, cambiar] = useState(false);
  return (
    <>
      <button onClick={() => cambiar(true)}>Abrir</button>
      <Hoja abierta={abierta} alCerrar={() => { cambiar(false); alCerrar(); }} titulo="Mi hoja" subtitulo="Descripción">
        <input aria-label="Primero" />
        <button>Segundo</button>
      </Hoja>
    </>
  );
};

describe("Hoja", () => {
  test("no pinta nada cerrada y al abrir es un diálogo modal con título", () => {
    render(<Prueba />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    userEvent.click(screen.getByText("Abrir"));
    const dialogo = screen.getByRole("dialog", { name: "Mi hoja" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Descripción")).toBeInTheDocument();
  });

  test("al abrir enfoca el primer campo y al cerrar devuelve el foco al botón que la abrió", () => {
    render(<Prueba />);
    const abrir = screen.getByText("Abrir");
    abrir.focus();
    userEvent.click(abrir);
    expect(screen.getByLabelText("Primero")).toHaveFocus();
    userEvent.keyboard("{esc}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });

  test("Escape, el botón ✕ y tocar fuera la cierran", () => {
    const alCerrar = jest.fn();
    render(<Prueba alCerrar={alCerrar} />);
    userEvent.click(screen.getByText("Abrir"));
    userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(alCerrar).toHaveBeenCalledTimes(1);
    userEvent.click(screen.getByText("Abrir"));
    userEvent.keyboard("{esc}");
    expect(alCerrar).toHaveBeenCalledTimes(2);
    userEvent.click(screen.getByText("Abrir"));
    userEvent.click(screen.getByRole("dialog").parentElement); //el fondo
    expect(alCerrar).toHaveBeenCalledTimes(3);
  });

  test("el foco no se escapa de la hoja con Tab", () => {
    render(<Prueba />);
    userEvent.click(screen.getByText("Abrir"));
    screen.getByRole("button", { name: "Segundo" }).focus();
    userEvent.tab();
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    userEvent.tab({ shift: true });
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  test("bloquea el scroll de la página mientras está abierta y lo restaura", () => {
    render(<Prueba />);
    userEvent.click(screen.getByText("Abrir"));
    expect(document.body.style.overflow).toBe("hidden");
    userEvent.keyboard("{esc}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  test("dos hojas abiertas a la vez tienen títulos con identificadores distintos", () => {
    render(
      <>
        <Hoja abierta alCerrar={() => {}} titulo="Primera"><p>a</p></Hoja>
        <Hoja abierta alCerrar={() => {}} titulo="Segunda" rol="alertdialog"><p>b</p></Hoja>
      </>
    );
    expect(screen.getByRole("dialog", { name: "Primera" })).toBeInTheDocument();
    expect(screen.getByRole("alertdialog", { name: "Segunda" })).toBeInTheDocument();
  });
});
