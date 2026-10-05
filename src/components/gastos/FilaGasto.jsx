import React from "react";
import styled from "styled-components";
import theme from "../../theme";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import Insignia from "../categorias/Insignia";

export const Fila = styled.div`
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  min-width: 0;
`;

export const Textos = styled.div`
  flex: 1;
  min-width: 0;

  strong {
    display: block;
    font-size: 0.9375rem;
    font-weight: 600;
    color: ${theme.tinta};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    display: block;
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const Monto = styled.div`
  flex-shrink: 0;
  text-align: right;
  font-size: 0.9375rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${theme.tinta};

  small {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: ${theme.tintaSuave};
  }
`;

//Contenido de una fila de gasto: icono de categoría, descripción, detalle y monto
const FilaGasto = ({ gasto, categoria, detalle, extra }) => (
  <Fila>
    <Insignia categoria={categoria} tam={2.75} />
    <Textos>
      <strong>{gasto.descripcion}</strong>
      <span>{detalle || categoria.texto}</span>
    </Textos>
    <Monto>
      {ConvertirAMoneda(gasto.cantidad)}
      {extra && <small>{extra}</small>}
    </Monto>
  </Fila>
);

export default FilaGasto;
