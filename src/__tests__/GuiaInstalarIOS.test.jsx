import React from "react";
import { render, screen } from "@testing-library/react";
import GuiaInstalarIOS from "../components/instalar/GuiaInstalarIOS";

const abrir = (info) => render(<GuiaInstalarIOS abierta alCerrar={() => {}} info={info} />);

describe("GuiaInstalarIOS", () => {
  test("Safari: 3 pasos con «⋯», «Agregar a pantalla de inicio» y el aviso de «Abrir como app web»", () => {
    abrir({ navegador: "safari", version: 26 });
    expect(screen.getByRole("dialog", { name: "Instalar en tu iPhone" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/En Safari toca «⋯»/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Toca «Agregar a pantalla de inicio»/)).toBeInTheDocument();
    expect(screen.getByText(/Deja activado «Abrir como app web»/)).toBeInTheDocument();
    expect(screen.queryByText(/abre la página en Safari/i)).not.toBeInTheDocument();
  });

  test("Chrome: pide el icono Compartir y avisa que, si no aparece, use Safari", () => {
    abrir({ navegador: "chrome", version: 17.02 });
    expect(screen.getByText(/En Chrome toca el icono Compartir/)).toBeInTheDocument();
    expect(screen.getByText(/abre la página en Safari y repite/i)).toBeInTheDocument();
  });

  test("navegador integrado (Instagram…): explica que no se puede y manda a Safari", () => {
    abrir({ navegador: "integrado", version: 17.04 });
    expect(screen.getByRole("status")).toHaveTextContent(/dentro de otra app/i);
    expect(screen.getByRole("status")).toHaveTextContent(/Safari/);
    expect(screen.queryByText(/Agregar a pantalla de inicio/)).not.toBeInTheDocument();
  });

  test("Chrome con iOS anterior a 16.4: no permite instalar y manda a Safari", () => {
    abrir({ navegador: "chrome", version: 15.07 });
    expect(screen.getByRole("status")).toHaveTextContent(/no permite instalar/i);
  });
});
