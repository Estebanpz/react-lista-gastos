import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectCategoria from "../components/SelectCategorias";

describe("SelectCategoria", () => {
  test("abre la lista, selecciona una categoría y la cierra", () => {
    const setCategoria = jest.fn();
    render(<SelectCategoria categoria="hogar" setCategoria={setCategoria} />);

    const disparador = screen.getByRole("button", { name: /categoría: hogar/i });
    expect(disparador).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    userEvent.click(disparador);
    expect(disparador).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(8);

    userEvent.click(screen.getByRole("option", { name: /transporte/i }));
    expect(setCategoria).toHaveBeenCalledWith("transporte");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  test("Escape cierra la lista y devuelve el foco al botón", () => {
    render(<SelectCategoria categoria="hogar" setCategoria={() => {}} />);
    const disparador = screen.getByRole("button", { name: /categoría/i });

    userEvent.click(disparador);
    userEvent.keyboard("{esc}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(disparador).toHaveFocus();
  });

  test("marca como seleccionada la categoría actual", () => {
    render(<SelectCategoria categoria="comida" setCategoria={() => {}} />);
    userEvent.click(screen.getByRole("button", { name: /categoría/i }));
    expect(screen.getByRole("option", { name: /comida/i })).toHaveAttribute("aria-selected", "true");
  });
});
