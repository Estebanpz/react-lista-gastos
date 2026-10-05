import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockOyente;
const mockInstalar = jest.fn();
const mockEstaInstalada = jest.fn();
const mockEsIOS = jest.fn();
jest.mock("../pwa/instalacion", () => ({
  suscribirInstalacion: (fn) => {
    mockOyente = fn;
    fn({ puedeInstalar: false, instalada: false });
    return () => {};
  },
  instalar: (...a) => mockInstalar(...a),
  estaInstalada: () => mockEstaInstalada(),
  esIOS: () => mockEsIOS(),
}));

import BannerInstalar from "../components/BannerInstalar";

describe("BannerInstalar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockEstaInstalada.mockReturnValue(false);
    mockEsIOS.mockReturnValue(false);
  });

  test("no aparece si el navegador no ofrece instalar", () => {
    render(<BannerInstalar />);
    expect(screen.queryByLabelText(/instalar la aplicación/i)).not.toBeInTheDocument();
  });

  test("aparece cuando se puede instalar y «Instalar app» lanza la instalación", () => {
    render(<BannerInstalar />);
    act(() => mockOyente({ puedeInstalar: true, instalada: false }));
    userEvent.click(screen.getByRole("button", { name: "Instalar app" }));
    expect(mockInstalar).toHaveBeenCalledTimes(1);
  });

  test("«Ahora no» lo oculta y lo recuerda 30 días", () => {
    const { unmount } = render(<BannerInstalar />);
    act(() => mockOyente({ puedeInstalar: true, instalada: false }));
    userEvent.click(screen.getByRole("button", { name: "Ahora no" }));
    expect(screen.queryByLabelText(/instalar la aplicación/i)).not.toBeInTheDocument();
    unmount();

    //al volver a abrir la app, sigue oculto
    render(<BannerInstalar />);
    act(() => mockOyente({ puedeInstalar: true, instalada: false }));
    expect(screen.queryByLabelText(/instalar la aplicación/i)).not.toBeInTheDocument();
  });

  test("tras 30 días el descarte caduca y vuelve a aparecer", () => {
    const hace31Dias = Date.now() - 31 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem("pwa:instalar:v1", String(hace31Dias));
    render(<BannerInstalar />);
    act(() => mockOyente({ puedeInstalar: true, instalada: false }));
    expect(screen.getByLabelText(/instalar la aplicación/i)).toBeInTheDocument();
  });

  test("no aparece si la app ya está instalada (modo standalone)", () => {
    mockEstaInstalada.mockReturnValue(true);
    render(<BannerInstalar />);
    act(() => mockOyente({ puedeInstalar: true, instalada: false }));
    expect(screen.queryByLabelText(/instalar la aplicación/i)).not.toBeInTheDocument();
  });

  test("en iOS muestra las instrucciones y no el botón «Instalar app»", () => {
    mockEsIOS.mockReturnValue(true);
    render(<BannerInstalar />);
    expect(screen.getByText(/toca Compartir/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar app" })).not.toBeInTheDocument();
  });

  test("sigue funcionando si localStorage lanza un error", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error("bloqueado"); };
    render(<BannerInstalar />);
    act(() => mockOyente({ puedeInstalar: true, instalada: false }));
    expect(screen.getByLabelText(/instalar la aplicación/i)).toBeInTheDocument();
    Storage.prototype.getItem = original;
  });
});
