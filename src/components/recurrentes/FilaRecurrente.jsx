import React from "react";
import styled from "styled-components";
import theme from "../../theme";
import Insignia from "../categorias/Insignia";
import EstadoPago, { estadoVisible, sePuedeRegistrar } from "./EstadoPago";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import { describirFrecuencia } from "../../functions/recurrencias";
import { IconoCheck } from "../iconos";

const Tarjeta = styled.article`
  display: flex;
  flex-direction: column;
  padding: 0.9rem 1rem;
  border: 2px solid ${(p) => (p.$seleccionada ? "#3e4bc7" : theme.borde)};
  border-radius: 1.25rem;
  background: ${(p) => (p.$pausado ? theme.campo : "#fff")};
  transition: border-color 0.15s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

//Toda la información es un botón (abre el detalle); el botón «Registrar pago» va aparte, no anidado
const Principal = styled.button`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 0.75rem;
  background: none;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;

  &:hover strong {
    color: #3e4bc7;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 4px;
  }
`;

const Texto = styled.span`
  min-width: 0;

  strong {
    display: block;
    font-size: 1rem;
    font-weight: 700;
    color: ${theme.tinta};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.875rem;
    color: ${theme.tintaSuave};
  }
`;

const Lado = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;

  b {
    font-size: 1rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
    white-space: nowrap;
  }
`;

const Pie = styled.div`
  display: flex;
  margin-top: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.75rem;
  border-top: 1px solid ${theme.borde};
`;

const BotonPagar = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.75rem;
  padding: 0 1.1rem;
  border: 0;
  border-radius: 999px;
  background: ${(p) => (p.$vencido ? "#B42318" : "#3e4bc7")};
  color: #fff;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$vencido ? "#912018" : "#2f3aa8")};
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const FilaRecurrente = ({ recurrente, categoria, hoy, seleccionada, alElegir, alRegistrar }) => {
  const estado = estadoVisible(recurrente, hoy);
  return (
    <Tarjeta $seleccionada={seleccionada} $pausado={estado === "pausado"} aria-label={recurrente.descripcion}>
      <Principal type="button" onClick={alElegir} aria-label={`${recurrente.descripcion}: ver detalle`}>
        <Insignia categoria={categoria} tam={2.75} />
        <Texto>
          <strong>{recurrente.descripcion}</strong>
          <small>{describirFrecuencia(recurrente)}</small>
        </Texto>
        <Lado>
          <b>{ConvertirAMoneda(recurrente.cantidad)}</b>
          <EstadoPago recurrente={recurrente} hoy={hoy} />
        </Lado>
      </Principal>
      {alRegistrar && sePuedeRegistrar(recurrente, hoy) && (
        <Pie>
          <BotonPagar type="button" $vencido={estado === "vencido"} onClick={alRegistrar}>
            <IconoCheck tam={18} />
            Registrar pago
          </BotonPagar>
        </Pie>
      )}
    </Tarjeta>
  );
};

export default FilaRecurrente;
