import React, { Suspense, lazy, useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Hoja from "../Hoja";
import { IconoCalendario } from "../iconos";

const Calendario = lazy(() => import("./Calendario"));

const aClave = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
const aFecha = (clave) => { const [a, m, d] = clave.split("-").map(Number); return new Date(a, m - 1, d); };
const etiqueta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });
const etiquetaConAnio = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" });

const Pastilla = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 1px solid ${theme.borde};
  border-radius: 999px;
  background: ${theme.campo};
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.tinta};
  cursor: pointer;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const Atajos = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.5rem;

  button {
    min-height: 2.5rem;
    padding: 0 1rem;
    border: 1px solid ${theme.borde};
    border-radius: 999px;
    background: #fff;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: ${theme.tinta};
    cursor: pointer;
  }

  button:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

//Botón con la fecha elegida (AAAA-MM-DD) que abre un calendario para cambiarla
const SelectorFecha = ({ valor, alCambiar, nombre = "Fecha del gasto" }) => {
  const [abierta, cambiarAbierta] = useState(false);
  const hoy = new Date();
  const fecha = aFecha(valor);
  const esHoy = valor === aClave(hoy);
  const texto = esHoy ? `Hoy, ${etiqueta.format(fecha)}` : fecha.getFullYear() === hoy.getFullYear() ? etiqueta.format(fecha) : etiquetaConAnio.format(fecha);

  const elegir = (dia) => {
    if (!dia) return;
    alCambiar(aClave(dia));
    cambiarAbierta(false);
  };
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);

  return (
    <>
      <Pastilla type="button" aria-haspopup="dialog" aria-label={`${nombre}: ${texto}. Cambiar`} onClick={() => cambiarAbierta(true)}>
        <IconoCalendario tam={16} />
        {texto}
      </Pastilla>
      <Hoja abierta={abierta} alCerrar={() => cambiarAbierta(false)} titulo={nombre} subtitulo="Puedes registrar gastos de días o meses anteriores." ancho="26rem">
        <Atajos>
          <button type="button" onClick={() => elegir(hoy)}>Hoy</button>
          <button type="button" onClick={() => elegir(ayer)}>Ayer</button>
        </Atajos>
        <Suspense fallback={<p role="status" style={{ textAlign: "center", padding: "2rem 0" }}>Cargando calendario…</p>}>
          <Calendario selected={fecha} onSelect={elegir} />
        </Suspense>
      </Hoja>
    </>
  );
};

export default SelectorFecha;
