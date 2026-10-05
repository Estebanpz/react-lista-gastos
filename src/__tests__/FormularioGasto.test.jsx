import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockAgregar = jest.fn();
jest.mock("../firebase/AgregarGasto", () => ({ __esModule: true, default: (...a) => mockAgregar(...a) }));
jest.mock("../firebase/ActualizarGasto", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ usuario: { uid: "ana" } }) }));

import FormularioGasto from "../components/FormularioGasto";

const llenarYEnviar = () => {
  userEvent.type(screen.getByLabelText(/descripción del gasto/i), "Arriendo");
  userEvent.clear(screen.getByLabelText(/cantidad gastada/i));
  userEvent.type(screen.getByLabelText(/cantidad gastada/i), "1500");
  userEvent.click(screen.getByRole("button", { name: /agregar gasto/i }));
};

describe("FormularioGasto", () => {
  beforeEach(() => {
    mockAgregar.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  const montar = () => render(<MemoryRouter><FormularioGasto /></MemoryRouter>);

  test("con conexión muestra «Gasto Agregado Correctamente» y limpia el formulario", async () => {
    mockAgregar.mockResolvedValue("sincronizado");
    montar();
    llenarYEnviar();
    expect(await screen.findByText("Gasto Agregado Correctamente")).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción del gasto/i)).toHaveValue("");
    expect(mockAgregar).toHaveBeenCalledWith("Arriendo", 1500, "hogar", expect.any(Number), "ana");
  });

  test("sin conexión (en cola) avisa que se sincronizará y también limpia el formulario", async () => {
    mockAgregar.mockResolvedValue("en-cola");
    montar();
    llenarYEnviar();
    expect(await screen.findByText(/guardado sin conexión/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción del gasto/i)).toHaveValue("");
  });

  test("si Firestore rechaza la escritura muestra un error", async () => {
    mockAgregar.mockRejectedValue(new Error("permission-denied"));
    montar();
    llenarYEnviar();
    expect(await screen.findByText(/no se pudo guardar el gasto/i)).toBeInTheDocument();
  });

  test("una cantidad en cero no se envía", async () => {
    montar();
    userEvent.type(screen.getByLabelText(/descripción del gasto/i), "Nada");
    userEvent.click(screen.getByRole("button", { name: /agregar gasto/i }));
    await waitFor(() => expect(mockAgregar).not.toHaveBeenCalled());
    expect(await screen.findByText(/cantidad valida|cantidad válida/i)).toBeInTheDocument();
  });
});
