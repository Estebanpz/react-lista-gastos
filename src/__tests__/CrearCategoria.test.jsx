import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockCrear = jest.fn();
const mockActualizar = jest.fn();
jest.mock("../firebase/categorias", () => ({
  crearCategoria: (...a) => mockCrear(...a),
  actualizarCategoria: (...a) => mockActualizar(...a),
  borrarCategoria: jest.fn(),
}));
jest.mock("../contexts/CategoriasContext", () => {
  const { crearContextoCategorias, PROPIA } = require("../testUtils/mocksApp");
  return { useCategorias: () => crearContextoCategorias([PROPIA]) };
});

import CrearCategoria from "../components/categorias/CrearCategoria";
import { PROPIA } from "../testUtils/mocksApp";

const montar = (props = {}) => {
  const alCerrar = jest.fn();
  const alGuardar = jest.fn();
  render(<CrearCategoria abierta alCerrar={alCerrar} alGuardar={alGuardar} {...props} />);
  return { alCerrar, alGuardar };
};

describe("CrearCategoria", () => {
  beforeEach(() => {
    mockCrear.mockReset().mockResolvedValue({ id: "NUEVA000000000000000", estado: "sincronizado" });
    mockActualizar.mockReset().mockResolvedValue("sincronizado");
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  test("muestra 12 iconos y 8 colores como grupos de opciones accesibles", () => {
    montar();
    expect(within(screen.getByRole("radiogroup", { name: "Icono" })).getAllByRole("radio")).toHaveLength(12);
    expect(within(screen.getByRole("radiogroup", { name: "Color" })).getAllByRole("radio")).toHaveLength(8);
  });

  test("la vista previa cambia con lo que escribes", () => {
    montar();
    userEvent.type(screen.getByLabelText("Nombre"), "Gimnasio");
    expect(screen.getByText("Gimnasio", { selector: "strong" })).toBeInTheDocument();
  });

  test("crea la categoría con el nombre limpio, el icono y el color elegidos", async () => {
    const { alCerrar, alGuardar } = montar();
    userEvent.type(screen.getByLabelText("Nombre"), "  Gimnasio ");
    userEvent.click(screen.getByRole("radio", { name: "Huella" }));
    userEvent.click(screen.getByRole("radio", { name: "Turquesa" }));
    expect(screen.getByRole("radio", { name: "Huella" })).toHaveAttribute("aria-checked", "true");
    userEvent.click(screen.getByRole("button", { name: /crear categoría/i }));
    await waitFor(() => expect(mockCrear).toHaveBeenCalledWith({ nombre: "Gimnasio", icono: "pata", color: "turquesa" }));
    expect(alGuardar).toHaveBeenCalledWith(expect.objectContaining({ id: "NUEVA000000000000000", texto: "Gimnasio", propia: true }));
    expect(alCerrar).toHaveBeenCalled();
  });

  test("sin nombre muestra el error, enfoca el campo y no guarda", () => {
    montar();
    userEvent.click(screen.getByRole("button", { name: /crear categoría/i }));
    expect(screen.getByText("Escribe un nombre para la categoría.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  test.each([["Comida"], ["comida"], ["NÓMINA"], ["publicidad"]])("rechaza el nombre repetido «%s» sin distinguir mayúsculas", (nombre) => {
    montar();
    userEvent.type(screen.getByLabelText("Nombre"), nombre);
    userEvent.click(screen.getByRole("button", { name: /crear categoría/i }));
    expect(screen.getByText("Ya existe una categoría con ese nombre.")).toBeInTheDocument();
    expect(mockCrear).not.toHaveBeenCalled();
  });

  test("al editar precarga los datos, permite conservar el mismo nombre y guarda cambios", async () => {
    const { alCerrar } = montar({ categoria: PROPIA });
    expect(screen.getByLabelText("Nombre")).toHaveValue("Publicidad");
    expect(screen.getByRole("radio", { name: "Megáfono" })).toHaveAttribute("aria-checked", "true");
    userEvent.click(screen.getByRole("radio", { name: "Azul" }));
    userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
    await waitFor(() => expect(mockActualizar).toHaveBeenCalledWith(PROPIA.id, { nombre: "Publicidad", icono: "megafono", color: "azul" }));
    expect(alCerrar).toHaveBeenCalled();
  });

  test("si falla el guardado avisa y no cierra", async () => {
    mockCrear.mockRejectedValue(new Error("permission-denied"));
    const { alCerrar } = montar();
    userEvent.type(screen.getByLabelText("Nombre"), "Gimnasio");
    userEvent.click(screen.getByRole("button", { name: /crear categoría/i }));
    expect(await screen.findAllByText(/no se pudo guardar la categoría/i)).not.toHaveLength(0);
    expect(alCerrar).not.toHaveBeenCalled();
  });

  test("Cancelar cierra sin guardar", () => {
    const { alCerrar } = montar();
    userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(alCerrar).toHaveBeenCalled();
    expect(mockCrear).not.toHaveBeenCalled();
  });
});
