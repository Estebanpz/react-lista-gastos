import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const mockIniciarSesion = jest.fn();
const mockRecuperar = jest.fn();
jest.mock("../firebase/autenticacion", () => ({
  iniciarSesion: (...a) => mockIniciarSesion(...a),
  recuperarClave: (...a) => mockRecuperar(...a),
}));

let mockUsuario = null;
jest.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ usuario: mockUsuario }) }));

import PaginaAuth from "../components/auth/PaginaAuth";

const Ruta = () => {
  const { pathname } = useLocation();
  return <p data-testid="ruta">{pathname}</p>;
};

const montar = (ruta = "/inicio-sesion") =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/inicio-sesion" element={<PaginaAuth />} />
        <Route path="/" element={<Ruta />} />
      </Routes>
      <Ruta />
    </MemoryRouter>
  );

//Solo hay un formulario (acceso por invitación): se busca en toda la página
const panelEntrar = () => within(document.body);

describe("PaginaAuth", () => {
  beforeEach(() => {
    mockUsuario = null;
    mockIniciarSesion.mockResolvedValue({});
    mockRecuperar.mockResolvedValue(undefined);
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  describe("estructura y accesibilidad", () => {
    test("tiene un único h1 y solo el inicio de sesión: el acceso es por invitación, sin registro", () => {
      montar();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 2, name: "Iniciar sesión" })).toBeInTheDocument();
      expect(screen.getByText(/el acceso es por invitación/i)).toBeInTheDocument();
      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
      expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Repetir contraseña")).not.toBeInTheDocument();
    });

    test("cada campo tiene su etiqueta visible y el autocompletado correcto", () => {
      montar();
      const p = panelEntrar();
      expect(p.getByLabelText("Correo electrónico")).toHaveAttribute("autocomplete", "email");
      expect(p.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "current-password");
    });

    test("«Recordarme» es un interruptor accesible y empieza activado", () => {
      montar();
      const interruptor = panelEntrar().getByRole("switch", { name: "Recordarme" });
      expect(interruptor).toBeChecked();
    });

    test("el botón del ojo muestra y oculta la contraseña", () => {
      montar();
      const p = panelEntrar();
      const campo = p.getByLabelText("Contraseña");
      expect(campo).toHaveAttribute("type", "password");
      userEvent.click(p.getByRole("button", { name: "Mostrar contraseña" }));
      expect(campo).toHaveAttribute("type", "text");
      expect(p.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("sesión abierta", () => {
    test("si ya hay sesión redirige al inicio", () => {
      mockUsuario = { uid: "ana" };
      montar();
      expect(screen.getAllByTestId("ruta")[0]).toHaveTextContent("/");
      expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
    });
  });

  describe("iniciar sesión", () => {
    test("con los campos vacíos muestra errores, enfoca el primero y no llama a Firebase", () => {
      montar();
      const p = panelEntrar();
      userEvent.click(p.getByRole("button", { name: /iniciar sesión/i }));
      expect(p.getByText("Escribe tu correo electrónico.")).toBeInTheDocument();
      expect(p.getByText("Escribe tu contraseña.")).toBeInTheDocument();
      expect(p.getByLabelText("Correo electrónico")).toHaveFocus();
      expect(p.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
      expect(mockIniciarSesion).not.toHaveBeenCalled();
    });

    test("rechaza un correo mal escrito con un mensaje que explica cómo corregirlo", () => {
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "no-es-correo");
      userEvent.type(p.getByLabelText("Contraseña"), "secreto1");
      userEvent.click(p.getByRole("button", { name: /iniciar sesión/i }));
      expect(p.getByText(/escribe un correo válido, por ejemplo/i)).toBeInTheDocument();
      expect(mockIniciarSesion).not.toHaveBeenCalled();
    });

    test("con datos válidos inicia sesión (recordando) y va al inicio", async () => {
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "  ana@correo.co ");
      userEvent.type(p.getByLabelText("Contraseña"), "secreto1");
      userEvent.click(p.getByRole("button", { name: /iniciar sesión/i }));
      await waitFor(() => expect(mockIniciarSesion).toHaveBeenCalledWith("ana@correo.co", "secreto1", true));
      await waitFor(() => expect(screen.getAllByTestId("ruta")[0]).toHaveTextContent("/"));
    });

    test("con «Recordarme» apagado pide la sesión solo de la pestaña", async () => {
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.type(p.getByLabelText("Contraseña"), "secreto1");
      userEvent.click(p.getByRole("switch", { name: "Recordarme" }));
      userEvent.click(p.getByRole("button", { name: /iniciar sesión/i }));
      await waitFor(() => expect(mockIniciarSesion).toHaveBeenCalledWith("ana@correo.co", "secreto1", false));
    });

    test("si Firebase rechaza, muestra el mensaje en español y deja reintentar", async () => {
      mockIniciarSesion.mockRejectedValue({ code: "auth/invalid-credential" });
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.type(p.getByLabelText("Contraseña"), "mala");
      userEvent.click(p.getByRole("button", { name: /iniciar sesión/i }));
      expect(await p.findByRole("alert")).toHaveTextContent(/correo o contraseña incorrectos/i);
      expect(p.getByRole("button", { name: /iniciar sesión/i })).toHaveAttribute("aria-busy", "false");
    });

    test("mientras envía muestra «Iniciando…» y evita enviar dos veces", async () => {
      let resolver;
      mockIniciarSesion.mockReturnValue(new Promise((r) => { resolver = r; }));
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.type(p.getByLabelText("Contraseña"), "secreto1");
      userEvent.click(p.getByRole("button", { name: /iniciar sesión/i }));
      const boton = await p.findByRole("button", { name: /iniciando/i });
      userEvent.click(boton);
      expect(mockIniciarSesion).toHaveBeenCalledTimes(1);
      resolver({});
      await waitFor(() => expect(screen.getAllByTestId("ruta")[0]).toHaveTextContent("/"));
    });
  });

  describe("recuperar contraseña", () => {
    test("pide el enlace, confirma sin revelar si el correo existe y permite volver", async () => {
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.click(p.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      expect(p.getByLabelText("Correo electrónico")).toHaveValue("ana@correo.co"); //conserva lo escrito
      userEvent.click(p.getByRole("button", { name: "Enviar enlace" }));
      await waitFor(() => expect(mockRecuperar).toHaveBeenCalledWith("ana@correo.co"));
      expect(await p.findByRole("status")).toHaveTextContent(/si ese correo tiene una cuenta/i);
      userEvent.click(p.getByRole("button", { name: /volver a iniciar sesión/i }));
      expect(p.getByLabelText("Contraseña")).toBeInTheDocument();
    });

    test("si el correo no tiene cuenta responde igual que si la tuviera (no revela qué correos existen)", async () => {
      mockRecuperar.mockRejectedValue({ code: "auth/user-not-found" });
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "nadie@correo.co");
      userEvent.click(p.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      userEvent.click(p.getByRole("button", { name: "Enviar enlace" }));
      expect(await p.findByRole("status")).toHaveTextContent(/si ese correo tiene una cuenta/i);
      expect(p.queryByRole("alert")).not.toBeInTheDocument();
    });

    test("un error real (sin conexión) sí se muestra", async () => {
      mockRecuperar.mockRejectedValue({ code: "auth/network-request-failed" });
      montar();
      const p = panelEntrar();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.click(p.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      userEvent.click(p.getByRole("button", { name: "Enviar enlace" }));
      expect(await p.findByRole("alert")).toHaveTextContent(/no hay conexión/i);
    });

    test("valida el correo antes de enviar", () => {
      montar();
      const p = panelEntrar();
      userEvent.click(p.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
      userEvent.click(p.getByRole("button", { name: "Enviar enlace" }));
      expect(p.getByText("Escribe tu correo electrónico.")).toBeInTheDocument();
      expect(mockRecuperar).not.toHaveBeenCalled();
    });
  });

  describe("cabecera de marca", () => {
    test("el asa muestra u oculta la cabecera", () => {
      montar();
      const asa = screen.getByRole("button", { name: "Ocultar la cabecera" });
      expect(asa).toHaveAttribute("aria-expanded", "true");
      userEvent.click(asa);
      expect(screen.getByRole("button", { name: "Mostrar la cabecera" })).toHaveAttribute("aria-expanded", "false");
    });

    test("al enfocar un campo (teclado abierto) la cabecera se contrae y al salir se recupera", () => {
      montar();
      userEvent.click(panelEntrar().getByLabelText("Correo electrónico"));
      expect(screen.getByRole("button", { name: "Mostrar la cabecera" })).toBeInTheDocument();
      userEvent.click(document.body);
      expect(screen.getByRole("button", { name: "Ocultar la cabecera" })).toBeInTheDocument();
    });
  });
});
