import React from "react";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";

const crecer = keyframes`from { transform: scaleX(0); } to { transform: scaleX(1); }`;

const Pista = styled.div`
  height: 0.4rem;
  border-radius: 999px;
  background: ${theme.campo};
  overflow: hidden;
`;

const Relleno = styled.div`
  height: 100%;
  border-radius: 999px;
  transform-origin: left center;
  animation: ${crecer} 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

//Barra de participación (0–100). Es decorativa: el porcentaje siempre se escribe al lado.
const BarraProgreso = ({ porcentaje, color, retraso = 0 }) => (
  <Pista aria-hidden="true">
    <Relleno style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%`, background: color, animationDelay: `${retraso}s` }} />
  </Pista>
);

export default BarraProgreso;
