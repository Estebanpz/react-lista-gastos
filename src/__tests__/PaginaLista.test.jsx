import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { getUnixTime } from "date-fns";

const mockBorrar = jest.fn();
const mockRango = jest.fn();
jest.mock("../firebase/BorrarGasto", () => ({ __esModule: true, default: (...a) => mockBorrar(...a) }));
jest.mock("../Hooks/useGastosRango", () => ({ __esModule: true, default: (...a) => mockRango(...a) }));
jest.mock("../contexts/CategoriasContext", () => {
  const { crearContextoCategorias, PROPIA } = require("../testUtils/mocksApp");
  return { useCategorias: () => crearContextoCategorias([PROPIA]) };
});

import PaginaLista from "../components/paginas/PaginaLista";

const ahora = new Date();
const hoy = (h) => getUnixTime(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, 0, 0));
const GASTOS = [
  { id: "g1", descripcion: "Almuerzo de trabajo", cantidad: 85000, categoria: "comida", fecha: hoy(13) },
  { id: "g2", descripcion: "Pago de nómina", cantidad: 1200000, categoria: "nomina", fecha: hoy(9) },
  { id: "g3", descripcion: "Pauta en redes", cantidad: 300000, categoria: "AAAAAAAAAAAAAAAAAAAA", fecha: hoy(8) },
];

const Sitio = () => <p data-testid="sitio">{useLocation().pathname}</p>;
const montar = () =>
  render(
    <MemoryRouter initialEntries={["/lista"]}>
      <Routes>
        <Route path="/lista" element={<PaginaLista />} />
        <Route path="*" element={<Sitio />} />
      </Routes>
    </MemoryRouter>
  );

describe("PaginaLista", () => {
  beforeEach(() => {
    mockBorrar.mockReset().mockResolvedValue("sincronizado");
    mockRango.mockReset().mockReturnValue({ gastos: GASTOS, cargando: false, error: null });
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  test("muestra el resumen del mes y agrupa los gastos por día con su subtotal", () => {
    montar();
    const resumen = screen.getByLabelText("Resumen del mes");
    expect(within(resumen).getByText("$ 1.585.000")).toBeInTheDocument();
    expect(within(resumen).getByText("3")).toBeInTheDocument();
    expect(within(resumen).getByText("Nómina")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^Hoy,/ })).toBeInTheDocument();
    expect(screen.getByText("Pago de nómina")).toBeInTheDocument();
  });

  test("pide al hook los gastos del mes en curso", () => {
    montar();
    const [desde, hasta] = mockRango.mock.calls[0];
    expect(desde).toBeLessThan(hasta);
    expect(new Date(desde * 1000).getDate()).toBe(1);
  });

  test("busca por descripción sin importar mayúsculas ni tildes y avisa cuántos hay", () => {
    montar();
    userEvent.type(screen.getByLabelText("Buscar gastos"), "NOMINA");
    expect(screen.getByText("Pago de nómina")).toBeInTheDocument();
    expect(screen.queryByText("Almuerzo de trabajo")).not.toBeInTheDocument();
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent("1 de 3 gastos");
  });

  test("filtra por categoría con chips y los combina con la búsqueda", () => {
    montar();
    const filtros = screen.getByRole("group", { name: "Filtrar por categoría" });
    userEvent.click(within(filtros).getByRole("button", { name: "Comida" }));
    expect(within(filtros).getByRole("button", { name: "Comida" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Almuerzo de trabajo")).toBeInTheDocument();
    expect(screen.queryByText("Pago de nómina")).not.toBeInTheDocument();
    userEvent.click(within(filtros).getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByText("Pago de nómina")).toBeInTheDocument();
  });

  test("sin coincidencias muestra la ilustración y permite limpiar los filtros", () => {
    montar();
    userEvent.type(screen.getByLabelText("Buscar gastos"), "zzzz");
    expect(screen.getByText("Nada coincide con tu búsqueda")).toBeInTheDocument();
    userEvent.click(screen.getAllByRole("button", { name: "Limpiar filtros" })[0]);
    expect(screen.getByText("Pago de nómina")).toBeInTheDocument();
  });

  test("ordena por mayor valor", () => {
    montar();
    userEvent.selectOptions(screen.getByLabelText("Ordenar por"), "mayor");
    const filas = screen.getAllByRole("button", { name: /\$/ }).filter((b) => /Almuerzo|nómina|Pauta/.test(b.textContent));
    expect(filas[0]).toHaveTextContent("Pago de nómina");
  });

  test("cambia a la vista «Por categoría»", () => {
    montar();
    userEvent.click(screen.getByRole("button", { name: "Por categoría" }));
    expect(screen.getByRole("button", { name: "Por categoría" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Nómina" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Publicidad" })).toBeInTheDocument();
  });

  test("muestra una categoría propia y «Sin categoría» si se borró", () => {
    mockRango.mockReturnValue({ gastos: [...GASTOS, { id: "g4", descripcion: "Huérfano", cantidad: 1000, categoria: "ZZZZZZZZZZZZZZZZZZZZ", fecha: hoy(7) }], cargando: false, error: null });
    montar();
    userEvent.click(screen.getByRole("button", { name: "Por categoría" }));
    expect(screen.getByRole("region", { name: "Sin categoría" })).toBeInTheDocument();
  });

  test("no deja ir al mes siguiente al estar en el mes actual y sí al anterior", () => {
    montar();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
    userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeEnabled();
    const [desde] = mockRango.mock.calls[mockRango.mock.calls.length - 1];
    expect(desde).toBeLessThan(mockRango.mock.calls[0][0]);
  });

  test("sin gastos en el mes muestra el estado vacío con ilustración", () => {
    mockRango.mockReturnValue({ gastos: [], cargando: false, error: null });
    montar();
    expect(screen.getByText(/no hay gastos en/i)).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Ir a Inicio" }));
    expect(screen.getByTestId("sitio")).toHaveTextContent("/");
  });

  test("si falla la carga lo explica", () => {
    mockRango.mockReturnValue({ gastos: [], cargando: false, error: new Error("x") });
    montar();
    expect(screen.getByText("No pudimos cargar tus gastos")).toBeInTheDocument();
  });

  test("tocar un gasto abre su detalle con «Editar» (enlace) y «Borrar»", () => {
    montar();
    userEvent.click(screen.getByText("Pago de nómina"));
    const detalle = screen.getByRole("dialog", { name: "Detalle del gasto" });
    expect(within(detalle).getByRole("link", { name: /editar/i })).toHaveAttribute("href", "/editar-gasto/g2");
    expect(within(detalle).getByRole("button", { name: /borrar/i })).toBeInTheDocument();
  });

  test("borrar pide confirmación con ilustración y solo borra al confirmar", async () => {
    montar();
    userEvent.click(screen.getByText("Pago de nómina"));
    userEvent.click(within(screen.getByRole("dialog", { name: "Detalle del gasto" })).getByRole("button", { name: /borrar/i }));
    const confirmacion = screen.getByRole("alertdialog", { name: "¿Borrar este gasto?" });
    expect(within(confirmacion).getByText(/Pago de nómina · \$ 1\.200\.000/)).toBeInTheDocument();
    expect(mockBorrar).not.toHaveBeenCalled();
    userEvent.click(within(confirmacion).getByRole("button", { name: "Cancelar" }));
    expect(mockBorrar).not.toHaveBeenCalled();

    userEvent.click(within(screen.getByRole("dialog", { name: "Detalle del gasto" })).getByRole("button", { name: /borrar/i }));
    userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /^borrar$/i }));
    await waitFor(() => expect(mockBorrar).toHaveBeenCalledWith("g2"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  test("si borrar falla muestra el error y no cierra la confirmación", async () => {
    mockBorrar.mockRejectedValue(new Error("permission-denied"));
    montar();
    userEvent.click(screen.getByText("Pago de nómina"));
    userEvent.click(within(screen.getByRole("dialog", { name: "Detalle del gasto" })).getByRole("button", { name: /borrar/i }));
    userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /^borrar$/i }));
    expect(await screen.findByText("No se pudo borrar. Inténtalo de nuevo.")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
