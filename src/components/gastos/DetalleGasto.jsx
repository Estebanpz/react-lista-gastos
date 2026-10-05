import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { fromUnixTime } from "date-fns";
import theme from "../../theme";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import Insignia from "../categorias/Insignia";
import { IconoEditar, IconoBorrar } from "../iconos";

const Caja = styled.div`
  display: grid;
  gap: 1rem;
`;

const Cabecera = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;

  div > span {
    display: block;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    overflow-wrap: anywhere;
    color: ${theme.tinta};
  }
`;

const Cifra = styled.p`
  padding: 1rem 1.1rem;
  border-radius: 1.1rem;
  background: ${theme.campo};
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: ${theme.tinta};

  small {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }
`;

const Datos = styled.dl`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  dt {
    font-size: 0.75rem;
    color: ${theme.tintaSuave};
  }

  dd {
    font-size: 0.9375rem;
    font-weight: 600;
    color: ${theme.tinta};
  }
`;

const Botones = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
`;

const base = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3.25rem;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
`;

const Editar = styled(Link)`
  ${base}
  background: ${theme.tinta};
  color: #fff;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const Borrar = styled.button`
  ${base}
  background: #fdecec;
  color: #8f1d1d;

  &:hover {
    background: #fbdcdc;
  }

  &:focus-visible {
    outline: 3px solid #b42323;
    outline-offset: 2px;
  }
`;

const fechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

const DetalleGasto = ({ gasto, categoria, alBorrar }) => {
  const fecha = fromUnixTime(gasto.fecha);
  return (
    <Caja>
      <Cabecera>
        <Insignia categoria={categoria} tam={3} />
        <div style={{ minWidth: 0 }}>
          <span>{categoria.texto}</span>
          <h3>{gasto.descripcion}</h3>
        </div>
      </Cabecera>
      <Cifra>
        <small>Monto</small>
        {ConvertirAMoneda(gasto.cantidad)}
      </Cifra>
      <Datos>
        <div>
          <dt>Fecha</dt>
          <dd>{fechaLarga.format(fecha)}</dd>
        </div>
        <div>
          <dt>Hora</dt>
          <dd>{hora.format(fecha)}</dd>
        </div>
      </Datos>
      <Botones>
        <Editar to={`/editar-gasto/${gasto.id}`}>
          <IconoEditar tam={18} /> Editar
        </Editar>
        <Borrar type="button" onClick={alBorrar}>
          <IconoBorrar tam={18} /> Borrar
        </Borrar>
      </Botones>
    </Caja>
  );
};

export default DetalleGasto;
