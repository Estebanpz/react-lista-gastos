import React from "react";
import { render, screen } from "@testing-library/react";

//Se simula el hook que consulta Firestore para probar solo la lógica derivada
const mockGastos = jest.fn();
jest.mock("../Hooks/useObtenerGastosMes", () => ({
  __esModule: true,
  default: () => [mockGastos()],
}));

import { TotalGastadoProvider, useTotalGastado } from "../contexts/TotalGastadoEnElMesContext";
import useObtenerGastosDelMesCategoria from "../Hooks/useObtenerGastosDelMesCategoria";

const MostrarTotal = () => <p data-testid="total">{useTotalGastado().totalGastado}</p>;

const MostrarCategorias = () => {
  const lista = useObtenerGastosDelMesCategoria();
  return (
    <ul>
      {lista.map((c) => (
        <li key={c.categoria}>{`${c.categoria}:${c.cantidad}`}</li>
      ))}
    </ul>
  );
};

describe("totales derivados", () => {
  test("TotalGastadoProvider suma las cantidades (aunque vengan como texto)", () => {
    mockGastos.mockReturnValue([{ cantidad: 1000 }, { cantidad: "500" }, { cantidad: 250.5 }]);
    render(
      <TotalGastadoProvider>
        <MostrarTotal />
      </TotalGastadoProvider>
    );
    expect(screen.getByTestId("total")).toHaveTextContent("1750.5");
  });

  test("sin gastos el total es 0", () => {
    mockGastos.mockReturnValue([]);
    render(
      <TotalGastadoProvider>
        <MostrarTotal />
      </TotalGastadoProvider>
    );
    expect(screen.getByTestId("total")).toHaveTextContent("0");
  });

  test("totales por categoría: las 8 categorías, suma correcta e ignora las desconocidas", () => {
    mockGastos.mockReturnValue([
      { categoria: "comida", cantidad: 100 },
      { categoria: "comida", cantidad: 50 },
      { categoria: "hogar", cantidad: 20 },
      { categoria: "inventada", cantidad: 999 },
    ]);
    render(<MostrarCategorias />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByText("comida:150")).toBeInTheDocument();
    expect(screen.getByText("hogar:20")).toBeInTheDocument();
    expect(screen.getByText("ropa:0")).toBeInTheDocument();
    expect(screen.queryByText(/inventada/)).not.toBeInTheDocument();
  });
});
