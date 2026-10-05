import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectorFecha from "../components/calendario/SelectorFecha";

const clave = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

describe("SelectorFecha", () => {
  test("muestra «Hoy» y abre un calendario en español", async () => {
    render(<SelectorFecha valor={clave(new Date())} alCambiar={() => {}} />);
    expect(screen.getByRole("button", { name: /Fecha del gasto: Hoy/ })).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: /Cambiar/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Fecha del gasto" });
    expect(await within(dialogo).findByRole("grid")).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: "Mes anterior" })).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("Año")).toBeInTheDocument();
  });

  test("elegir un día de un mes anterior lo devuelve como AAAA-MM-DD y cierra la hoja", async () => {
    const alCambiar = jest.fn();
    render(<SelectorFecha valor="2026-03-15" alCambiar={alCambiar} />);
    userEvent.click(screen.getByRole("button", { name: /Cambiar/ }));
    const dialogo = await screen.findByRole("dialog");
    userEvent.click(await within(dialogo).findByRole("gridcell", { name: "20 de marzo de 2026" }));
    expect(alCambiar).toHaveBeenCalledWith("2026-03-20");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("los atajos «Hoy» y «Ayer»", async () => {
    const alCambiar = jest.fn();
    render(<SelectorFecha valor="2020-01-01" alCambiar={alCambiar} />);
    userEvent.click(screen.getByRole("button", { name: /Cambiar/ }));
    userEvent.click(await screen.findByRole("button", { name: "Ayer" }));
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    expect(alCambiar).toHaveBeenCalledWith(clave(ayer));
  });
});
