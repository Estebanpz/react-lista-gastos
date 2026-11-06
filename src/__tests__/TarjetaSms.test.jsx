import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TarjetaSms from "../components/recurrentes/TarjetaSms";
import { guardarSms } from "../firebase/sms";
import { getDoc } from "../firebase/firebaseConfig";

jest.mock("../firebase/firebaseConfig", () => ({ db: {}, auth: { currentUser: { uid: "ana" } }, doc: jest.fn(() => "usuarios/ana"), getDoc: jest.fn() }));
jest.mock("../firebase/sms", () => ({ guardarSms: jest.fn() }));

describe("TarjetaSms", () => {
  beforeEach(() => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ celular: "+573001234567", smsActivo: false, detalleEnAviso: true }) });
    guardarSms.mockResolvedValue("sincronizado");
  });

  test("muestra el celular guardado sin +57 y guarda al encender el SMS", async () => {
    render(<TarjetaSms />);
    const campo = await screen.findByLabelText("Celular");
    expect(campo).toHaveValue("3001234567");
    fireEvent.click(screen.getByLabelText("Recordarme por SMS"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(guardarSms).toHaveBeenCalledWith("ana", { celular: "+573001234567", smsActivo: true, detalleEnAviso: true }));
    expect(await screen.findByText("Listo: te enviaremos el SMS el día de cada pago.")).toBeInTheDocument();
  });

  test("no guarda un celular inválido", async () => {
    render(<TarjetaSms />);
    fireEvent.change(await screen.findByLabelText("Celular"), { target: { value: "300 12" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Escribe tu celular de 10 dígitos (empieza por 3).")).toBeInTheDocument();
    expect(guardarSms).not.toHaveBeenCalled();
  });
});
