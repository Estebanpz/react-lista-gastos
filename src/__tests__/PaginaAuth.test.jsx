import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const mockIniciarSesion = jest.fn();
const mockRegistrar = jest.fn();
const mockRecuperar = jest.fn();
jest.mock("../firebase/autenticacion", () => ({
  iniciarSesion: (...a) => mockIniciarSesion(...a),
  registrarUsuario: (...a) => mockRegistrar(...a),
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
        <Route path="/crear-cuenta" element={<PaginaAuth />} />
        <Route path="/" element={<Ruta />} />
      </Routes>
      <Ruta />
    </MemoryRouter>
  );

const panelEntrar = () => within(document.getElementById("panel-entrar"));
const panelCrear = () => within(document.getElementById("panel-crear"));

describe("PaginaAuth", () => {
  beforeEach(() => {
    mockUsuario = null;
    mockIniciarSesion.mockResolvedValue({});
    mockRegistrar.mockResolvedValue({});
    mockRecuperar.mockResolvedValue(undefined);
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  describe("estructura y accesibilidad", () => {
    test("tiene un único h1, un selector de pestañas y los dos paneles", () => {
      montar();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      const pestanas = screen.getAllByRole("tab");
      expect(pestanas.map((p) => p.textContent)).toEqual(["Iniciar sesión", "Crear cuenta"]);
      expect(pestanas[0]).toHaveAttribute("aria-selected", "true");
      expect(pestanas[1]).toHaveAttribute("aria-selected", "false");
      expect(document.getElementById("panel-entrar")).toHaveAttribute("aria-labelledby", "pestana-entrar");
    });

    test("cada campo tiene su etiqueta visible y el autocompletado correcto", () => {
      montar();
      const p = panelEntrar();
      expect(p.getByLabelText("Correo electrónico")).toHaveAttribute("autocomplete", "email");
      expect(p.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "current-password");
      const c = panelCrear();
      expect(c.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "new-password");
      expect(c.getByLabelText("Repetir contraseña")).toHaveAttribute("autocomplete", "new-password");
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

    test("las flechas del teclado cambian de pestaña", () => {
      montar();
      screen.getByRole("tab", { name: "Iniciar sesión" }).focus();
      userEvent.keyboard("{arrowright}");
      expect(screen.getByTestId("ruta", { selector: "p" })).toBeDefined();
      expect(screen.getAllByTestId("ruta")[0]).toHaveTextContent("/crear-cuenta");
    });
  });

  describe("cambio de panel", () => {
    test("pulsar «Crear cuenta» actualiza la URL y el panel activo", () => {
      montar();
      userEvent.click(screen.getByRole("tab", { name: "Crear cuenta" }));
      expect(screen.getAllByTestId("ruta")[0]).toHaveTextContent("/crear-cuenta");
      expect(screen.getByRole("tab", { name: "Crear cuenta" })).toHaveAttribute("aria-selected", "true");
    });

    test("abrir /crear-cuenta directamente deja activa esa pestaña", () => {
      montar("/crear-cuenta");
      expect(screen.getByRole("tab", { name: "Crear cuenta" })).toHaveAttribute("aria-selected", "true");
    });

    test("si ya hay sesión redirige al inicio", () => {
      mockUsuario = { uid: "ana" };
      montar();
      expect(screen.getAllByTestId("ruta")[0]).toHaveTextContent("/");
      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
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

  describe("crear cuenta", () => {
    const abrir = () => {
      montar("/crear-cuenta");
      return panelCrear();
    };

    test("exige al menos 6 caracteres y que las contraseñas coincidan", () => {
      const p = abrir();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.type(p.getByLabelText("Contraseña"), "123");
      userEvent.type(p.getByLabelText("Repetir contraseña"), "456");
      userEvent.click(p.getByRole("button", { name: /crear cuenta/i }));
      expect(p.getByText("Usa al menos 6 caracteres.")).toBeInTheDocument();
      expect(p.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
      expect(mockRegistrar).not.toHaveBeenCalled();
    });

    test("con datos válidos crea la cuenta y va al inicio", async () => {
      const p = abrir();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.type(p.getByLabelText("Contraseña"), "secreto1");
      userEvent.type(p.getByLabelText("Repetir contraseña"), "secreto1");
      userEvent.click(p.getByRole("button", { name: /crear cuenta/i }));
      await waitFor(() => expect(mockRegistrar).toHaveBeenCalledWith("ana@correo.co", "secreto1", true));
      await waitFor(() => expect(screen.getAllByTestId("ruta")[0]).toHaveTextContent("/"));
    });

    test("si el correo ya existe explica qué hacer", async () => {
      mockRegistrar.mockRejectedValue({ code: "auth/email-already-in-use" });
      const p = abrir();
      userEvent.type(p.getByLabelText("Correo electrónico"), "ana@correo.co");
      userEvent.type(p.getByLabelText("Contraseña"), "secreto1");
      userEvent.type(p.getByLabelText("Repetir contraseña"), "secreto1");
      userEvent.click(p.getByRole("button", { name: /crear cuenta/i }));
      expect(await p.findByRole("alert")).toHaveTextContent(/ya tiene una cuenta.*inicia sesión/i);
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
