import React from "react";
import styled from "styled-components";
import theme from "../../theme";
import Insignia from "../categorias/Insignia";
import EstadoPago, { estadoVisible } from "./EstadoPago";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import { describirFrecuencia, fechaLegible } from "../../functions/recurrencias";
import { BotonPrincipal } from "../auth/elementos";
import { BotonSecundario } from "./elementos";
import { IconoEditar, IconoBorrar } from "../iconos";

const Caja = styled.div`
  display: grid;
  gap: 1rem;
`;

const Cabecera = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;

  h3 {
    text-wrap: balance;
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
    color: ${theme.tinta};
  }

  p {
    font-size: 0.875rem;
    color: ${theme.tintaSuave};
  }
`;

const Cifra = styled.div`
  padding: 1rem 1.1rem;
  border-radius: 1.1rem;
  background: ${theme.campo};

  small {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  strong {
    display: block;
    font-size: 1.9rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.4rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: ${theme.tintaSuave};
  }
`;

const Botones = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const Enlaces = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 1rem;

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.75rem;
    padding: 0 0.5rem;
    border: 0;
    border-radius: 0.5rem;
    background: none;
    font: inherit;
    font-weight: 700;
    color: ${theme.tinta};
    cursor: pointer;
  }

  button:hover {
    background: ${theme.campo};
  }

  button[data-peligro] {
    color: #b42318;
  }

  button:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const DetalleRecurrente = ({ recurrente, categoria, hoy, alRegistrar, alOmitir, alEditar, alPausar, alBorrar }) => (
  <Caja>
    <Cabecera>
      <Insignia categoria={categoria} tam={3} />
      <div style={{ minWidth: 0 }}>
        <h3>{recurrente.descripcion}</h3>
        <p>{categoria.texto} · {describirFrecuencia(recurrente)}</p>
      </div>
    </Cabecera>
    <Cifra>
      <small>Monto</small>
      <strong>{ConvertirAMoneda(recurrente.cantidad)}</strong>
      <p>
        {recurrente.activo ? `Próximo pago: ${fechaLegible(recurrente.proximaFecha, hoy)}` : "En pausa: no se avisa"}
        {/* Si el pago no es inminente, la fecha ya lo dice todo: no se repite en la etiqueta */}
        {estadoVisible(recurrente, hoy) !== "al-dia" && <EstadoPago recurrente={recurrente} hoy={hoy} />}
      </p>
    </Cifra>
    {recurrente.activo && alRegistrar && (
      <Botones>
        <BotonPrincipal type="button" onClick={alRegistrar}>Registrar pago</BotonPrincipal>
        <BotonSecundario type="button" onClick={alOmitir}>Omitir esta vez</BotonSecundario>
      </Botones>
    )}
    <Enlaces>
      <button type="button" onClick={alEditar}><IconoEditar tam={18} />Editar</button>
      <button type="button" onClick={alPausar}>{recurrente.activo ? "Pausar" : "Reanudar"}</button>
      <button type="button" data-peligro onClick={alBorrar}><IconoBorrar tam={18} />Borrar</button>
    </Enlaces>
  </Caja>
);

export default DetalleRecurrente;
