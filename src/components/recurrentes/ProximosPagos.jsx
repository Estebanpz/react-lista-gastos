import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import theme from "../../theme";
import Insignia from "../categorias/Insignia";
import EstadoPago from "./EstadoPago";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import { describirFrecuencia } from "../../functions/recurrencias";
import { useRecurrentes } from "../../contexts/RecurrentesContext";
import { useCategorias } from "../../contexts/CategoriasContext";

const Lista = styled.ul`
  list-style: none;
  display: grid;
  gap: 0.6rem;
`;

const Fila = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;

  strong {
    display: block;
    font-size: 0.9375rem;
    color: ${theme.tinta};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
  }
`;

const Lado = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;

  b {
    font-size: 1.125rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
    white-space: nowrap;
  }
`;

const Vacio = styled.div`
  padding: 0.5rem 0;
  text-align: center;

  p {
    color: ${theme.tintaSuave};
    line-height: 1.45;
  }

  a {
    display: inline-block;
    margin-top: 0.5rem;
    font-weight: 700;
    color: #3e4bc7;
  }
`;

//Los 3 pagos activos más cercanos (datos reales; nada inventado si no hay)
const ProximosPagos = () => {
  const { recurrentes, cargando, hoy } = useRecurrentes();
  const { porId } = useCategorias();
  const proximos = recurrentes.filter((r) => r.activo).slice(0, 3);

  if (cargando) return null;
  if (!proximos.length) {
    return (
      <Vacio>
        <p>Programa la nómina, los recibos o las cuotas que pagas cada mes y te avisamos antes de que venzan.</p>
        <Link to="/recurrentes">Programar un pago</Link>
      </Vacio>
    );
  }
  return (
    <Lista>
      {proximos.map((r) => (
        <Fila key={r.id}>
          <Insignia categoria={porId(r.categoria)} tam={2.5} />
          <div style={{ minWidth: 0 }}>
            <strong>{r.descripcion}</strong>
            <small>{describirFrecuencia(r)}</small>
          </div>
          <Lado>
            <b>{ConvertirAMoneda(r.cantidad)}</b>
            <EstadoPago recurrente={r} hoy={hoy} />
          </Lado>
        </Fila>
      ))}
    </Lista>
  );
};

export default ProximosPagos;
