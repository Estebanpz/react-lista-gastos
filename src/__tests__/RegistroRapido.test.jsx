import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { crearContextoCategorias, PROPIA } from "../testUtils/mocksApp";

const mockAgregar = jest.fn();
const mockActualizar = jest.fn();
jest.mock("../firebase/AgregarGasto", () => ({ __esModule: true, default: (...a) => mockAgregar(...a) }));
jest.mock("../firebase/ActualizarGasto", () => ({ __esModule: true, default: (...a) => mockActualizar(...a) }));
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ usuario: { uid: "ana" } }) }));
jest.mock("../contexts/CategoriasContext", () => {
  const { crearContextoCategorias, PROPIA } = require("../testUtils/mocksApp");
  return { useCategorias: () => crearContextoCategorias([PROPIA]) };
});
jest.mock("../firebase/categorias", () => ({ crearCategoria: jest.fn(), actualizarCategoria: jest.fn(), borrarCategoria: jest.fn() }));

import RegistroRapido, { interpretarMonto } from "../components/gastos/RegistroRapido";

const montar = (props = {}) => render(<MemoryRouter><RegistroRapido {...props} /></MemoryRouter>);
const monto = () => screen.getByLabelText(/valor del gasto/i);
const detalle = () => screen.getByLabelText("Detalle");

describe("interpretarMonto", () => {
  test.each([
    ["1500", 1500], ["1500,50", 1500.5], ["1500.50", 1500.5], ["", 0], [",", 0], ["abc", 0], ["12 000", 12000],
  ])("«%s» → %s", (texto, esperado) => expect(interpretarMonto(texto)).toBe(esperado));
});

describe("RegistroRapido", () => {
  beforeEach(() => {
    mockAgregar.mockReset().mockResolvedValue("sincronizado");
    mockActualizar.mockReset().mockResolvedValue("sincronizado");
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  test("ofrece las 12 categorías, las propias y un chip «Nueva»", () => {
    montar();
    expect(screen.getAllByRole("radio")).toHaveLength(13);
    expect(screen.getByRole("radio", { name: /nómina/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /publicidad/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear una categoría nueva/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /comida/i })).toHaveAttribute("aria-checked", "true");
  });

  test("solo deja escribir dígitos y un separador decimal y muestra el valor en pesos", () => {
    montar();
    userEvent.type(monto(), "1a2.5,0x");
    expect(monto()).toHaveValue("12.50"); //manda el primer separador y descarta los demás
    userEvent.clear(monto());
    userEvent.type(monto(), "1500000");
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
  });

  test("sin monto ni detalle muestra errores, enfoca el primero y no guarda", () => {
    montar();
    userEvent.click(screen.getByRole("button", { name: /guardar gasto/i }));
    expect(screen.getByText("Escribe cuánto gastaste.")).toBeInTheDocument();
    expect(screen.getByText("Cuéntanos en qué gastaste.")).toBeInTheDocument();
    expect(monto()).toHaveFocus();
    expect(mockAgregar).not.toHaveBeenCalled();
  });

  test("con monto pero sin detalle enfoca el detalle", () => {
    montar();
    userEvent.type(monto(), "5000");
    userEvent.click(screen.getByRole("button", { name: /guardar gasto/i }));
    expect(detalle()).toHaveFocus();
  });

  test("Enter en el monto pasa al detalle sin enviar", () => {
    montar();
    userEvent.type(monto(), "5000{enter}");
    expect(detalle()).toHaveFocus();
    expect(mockAgregar).not.toHaveBeenCalled();
  });

  test("guarda con el monto como número, la categoría elegida y el uid", async () => {
    montar();
    userEvent.type(monto(), "85000");
    userEvent.click(screen.getByRole("radio", { name: /nómina/i }));
    userEvent.type(detalle(), "  Pago quincena ");
    userEvent.click(screen.getByRole("button", { name: /guardar gasto/i }));
    await waitFor(() => expect(mockAgregar).toHaveBeenCalledTimes(1));
    expect(mockAgregar).toHaveBeenCalledWith("Pago quincena", 85000, "nomina", expect.any(Number), "ana");
  });

  test("muestra la confirmación con ilustración y permite registrar otro", async () => {
    montar();
    userEvent.type(monto(), "85000");
    userEvent.type(detalle(), "Mercado");
    userEvent.click(screen.getByRole("button", { name: /guardar gasto/i }));
    expect(await screen.findByRole("status")).toHaveTextContent("¡Gasto guardado!");
    expect(screen.getByRole("link", { name: /ver mi lista/i })).toHaveAttribute("href", "/lista");
    userEvent.click(screen.getByRole("button", { name: /registrar otro gasto/i }));
    expect(monto()).toHaveValue("");
    expect(detalle()).toHaveValue("");
  });

  test("si quedó en cola (sin conexión) lo explica", async () => {
    mockAgregar.mockResolvedValue("en-cola");
    montar();
    userEvent.type(monto(), "1000");
    userEvent.type(detalle(), "Café");
    userEvent.click(screen.getByRole("button", { name: /guardar gasto/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/se sincronizará cuando vuelvas a tener conexión/i);
  });

  test("si falla el guardado muestra el error y deja reintentar", async () => {
    mockAgregar.mockRejectedValue(new Error("permission-denied"));
    montar();
    userEvent.type(monto(), "1000");
    userEvent.type(detalle(), "Café");
    userEvent.click(screen.getByRole("button", { name: /guardar gasto/i }));
    expect(await screen.findByText(/no se pudo guardar el gasto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar gasto/i })).toHaveAttribute("aria-busy", "false");
  });

  test("al editar precarga los datos y guarda con actualizarGasto", async () => {
    const gasto = { id: "g1", descripcion: "Arriendo", cantidad: 1500000, categoria: "hogar", fecha: 1790000000 };
    montar({ gasto });
    expect(monto()).toHaveValue("1500000");
    expect(detalle()).toHaveValue("Arriendo");
    expect(screen.getByRole("radio", { name: /hogar/i })).toHaveAttribute("aria-checked", "true");
    userEvent.clear(monto());
    userEvent.type(monto(), "1600000");
    userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
    await waitFor(() => expect(mockActualizar).toHaveBeenCalledWith("g1", "Arriendo", 1600000, "hogar", expect.any(Number)));
    expect(mockAgregar).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Cambios guardados");
  });

  test("el chip «Nueva» abre la hoja para crear una categoría", () => {
    montar();
    userEvent.click(screen.getByRole("button", { name: /crear una categoría nueva/i }));
    expect(screen.getByRole("dialog", { name: /crear categoría/i })).toBeInTheDocument();
  });
});
