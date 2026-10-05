import React from "react";
import styled from "styled-components";
import theme from "../../theme";

const Etiqueta = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 2.75rem;
  font-size: 0.9375rem;
  color: ${theme.tinta};
  cursor: pointer;
`;

//El input real queda oculto pero sigue siendo enfocable y lo lee el lector de pantalla como «interruptor»
const Casilla = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  margin: 0;
`;

const Pista = styled.span`
  position: relative;
  flex-shrink: 0;
  width: 2.75rem;
  height: 1.6rem;
  border-radius: 999px;
  background: #8a94a6;
  transition: background-color 0.2s ease;

  &::after {
    content: "";
    position: absolute;
    top: 0.2rem;
    left: 0.2rem;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  ${Casilla}:checked + & {
    background: ${theme.colorPrimario};
  }

  ${Casilla}:checked + &::after {
    transform: translateX(1.15rem);
  }

  ${Casilla}:focus-visible + & {
    outline: 3px solid ${theme.azulClaro};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::after {
      transition: none;
    }
  }
`;

const Interruptor = ({ id, etiqueta, marcado, alCambiar }) => (
  <Etiqueta htmlFor={id}>
    <Casilla id={id} type="checkbox" role="switch" checked={marcado} onChange={(e) => alCambiar(e.target.checked)} />
    <Pista aria-hidden="true" />
    {etiqueta}
  </Etiqueta>
);

export default Interruptor;
