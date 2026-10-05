import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { getUnixTime } from "date-fns";

const mockRango = jest.fn();
const mockBorrarCat = jest.fn();
let mockPropias = [];
jest.mock("../Hooks/useGastosRango", () => ({ __esModule: true, default: (...a) => mockRango(...a) }));
jest.mock("../firebase/categorias", () => ({ crearCategoria: jest.fn(), actualizarCategoria: jest.fn(), borrarCategoria: (...a) => mockBorrarCat(...a) }));
jest.mock("../contexts/CategoriasContext", () => {
  const { crearContextoCategorias } = require("../testUtils/mocksApp");
  return { useCategorias: () => crearContextoCategorias(mockPropias) };
});

import PaginaCategorias from "../components/paginas/PaginaCategorias";
import { PROPIA } from "../testUtils/mocksApp";

const ahora = new Date();
const f = getUnixTime(new Date(ahora.getFullYear(), ahora.getMonth(), 2, 10));
const GASTOS = [
  { id: "1", descripcion: "a", cantidad: 1200000, categoria: "nomina", fecha: f },
  { id: "2", descripcion: "b", cantidad: 300000, categoria: "comida", fecha: f },
  { id: "3", descripcion: "c", cantidad: 500000, categoria: "AAAAAAAAAAAAAAAAAAAA", fecha: f },
];

const montar = () => render(<MemoryRouter><PaginaCategorias /></MemoryRouter>);
const ranking = () => within(screen.getByRole("heading", { name: /ranking/i }).closest("section")).getAllByRole("listitem");

describe("PaginaCategorias", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPropias = [PROPIA];
    mockBorrarCat.mockReset().mockResolvedValue("sincronizado");
    mockRango.mockReset().mockReturnValue({ gastos: GASTOS, cargando: false, error: null });
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  test("ordena el ranking de mayor a menor gasto y deja al final las que no tienen gasto", () => {
    montar();
    const filas = ranking();
    expect(filas).toHaveLength(13);
    expect(filas[0]).toHaveTextContent("Nómina");
    expect(filas[1]).toHaveTextContent("Publicidad");
    expect(filas[2]).toHaveTextContent("Comida");
    expect(filas[filas.length - 1]).toHaveTextContent("Sin gastos");
  });

  test("marca las nuevas con «Nuevo» y las propias con «Mía»", () => {
    montar();
    const nomina = ranking()[0];
    expect(within(nomina).getByText("Nuevo")).toBeInTheDocument();
    expect(within(ranking()[1]).getByText("Mía")).toBeInTheDocument();
    expect(within(nomina).getByText("pago a colaboradores")).toBeInTheDocument();
  });

  test("muestra los porcentajes y el total en la dona (con texto alternativo)", () => {
    montar();
    expect(within(ranking()[0]).getByText("60,0 %")).toBeInTheDocument();
    const dona = screen.getByRole("img", { name: /distribución del gasto/i });
    expect(dona).toHaveAttribute("aria-label", expect.stringContaining("Nómina: 60,0 %"));
    expect(within(dona).getByText("$ 2.000.000")).toBeInTheDocument();
  });

  test("el filtro «Para negocio» deja solo las 4 nuevas y «Mis categorías» solo las propias", () => {
    montar();
    userEvent.click(screen.getByRole("button", { name: "Para negocio" }));
    expect(ranking()).toHaveLength(4);
    userEvent.click(screen.getByRole("button", { name: "Mis categorías" }));
    expect(ranking()).toHaveLength(1);
    expect(ranking()[0]).toHaveTextContent("Publicidad");
  });

  test("sin categorías propias el filtro «Mis categorías» invita a crear la primera con ilustración", () => {
    mockPropias = [];
    montar();
    userEvent.click(screen.getByRole("button", { name: "Mis categorías" }));
    expect(screen.getAllByText("Aún no tienes categorías propias").length).toBeGreaterThan(0);
    userEvent.click(screen.getByRole("button", { name: /crear mi primera categoría/i }));
    expect(screen.getByRole("dialog", { name: "Crear categoría" })).toBeInTheDocument();
  });

  test("la explicación inicial se muestra una vez y «Entendido» la recuerda", () => {
    const { unmount } = montar();
    expect(screen.getByLabelText("Cómo funcionan las categorías")).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByLabelText("Cómo funcionan las categorías")).not.toBeInTheDocument();
    unmount();
    montar();
    expect(screen.queryByLabelText("Cómo funcionan las categorías")).not.toBeInTheDocument();
  });

  test("cambia entre Mes y Año pidiendo otro rango de fechas", () => {
    montar();
    const [d1, h1] = mockRango.mock.calls[0];
    userEvent.click(screen.getByRole("button", { name: "Año" }));
    const [d2, h2] = mockRango.mock.calls[mockRango.mock.calls.length - 1];
    expect(d2).toBeLessThan(d1);
    expect(h2).toBeGreaterThan(h1);
  });

  test("«Nueva categoría» abre la hoja y editar una propia la abre con sus datos", () => {
    montar();
    userEvent.click(screen.getByRole("button", { name: "Nueva categoría" }));
    expect(screen.getByRole("dialog", { name: "Crear categoría" })).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    userEvent.click(screen.getByRole("button", { name: "Editar la categoría Publicidad" }));
    expect(screen.getByRole("dialog", { name: "Editar categoría" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Publicidad");
  });

  test("borrar una categoría propia pide confirmación y explica qué pasa con sus gastos", async () => {
    montar();
    userEvent.click(screen.getByRole("button", { name: "Borrar la categoría Publicidad" }));
    const confirmacion = screen.getByRole("alertdialog", { name: "¿Borrar esta categoría?" });
    expect(within(confirmacion).getByText(/se mostrarán como «Sin categoría»/)).toBeInTheDocument();
    userEvent.click(within(confirmacion).getByRole("button", { name: /^borrar$/i }));
    await waitFor(() => expect(mockBorrarCat).toHaveBeenCalledWith(PROPIA.id));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  test("las categorías que vienen con la app no se pueden editar ni borrar", () => {
    montar();
    expect(screen.queryByRole("button", { name: /editar la categoría nómina/i })).not.toBeInTheDocument();
  });

  test("sin gastos muestra la ilustración y el ranking con todo en cero", () => {
    mockRango.mockReturnValue({ gastos: [], cargando: false, error: null });
    montar();
    expect(screen.getByText(/aún no hay gastos en/i)).toBeInTheDocument();
    expect(ranking()).toHaveLength(13);
  });
});
