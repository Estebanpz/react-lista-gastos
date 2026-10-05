import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import theme from "../theme";

const Fondo = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  overscroll-behavior: contain;
`;

const Cuadro = styled.div`
  background: #fff;
  width: 90%;
  max-width: 24rem;
  padding: 2rem;
  border-radius: 0.625rem; /* 10px */
  box-shadow: 0px 1.25rem 2.5rem rgba(0, 0, 0, 0.15);
  text-align: center;
`;

const Texto = styled.p`
  font-size: 1.25rem; /* 20px */
  margin-bottom: 1.5rem;
  overflow-wrap: anywhere;
`;

const Acciones = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

const Accion = styled.button`
  border: none;
  border-radius: 0.625rem; /* 10px */
  color: ${(props) => (props.peligro ? "#fff" : "#000")};
  background: ${(props) => (props.peligro ? theme.rojo : theme.grisClaro)};
  font-family: "Work Sans", sans-serif;
  font-size: 1.1rem;
  font-weight: 500;
  padding: 0.9rem 1.5rem;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

//Diálogo modal de confirmación para acciones destructivas.
//El foco empieza en «Cancelar» y Escape también cancela.
const DialogoConfirmacion = ({
  mensaje,
  textoConfirmar = "Borrar",
  alConfirmar,
  alCancelar,
}) => {
  const botonCancelar = useRef(null);

  useEffect(() => {
    botonCancelar.current.focus();
  }, []);

  const alPresionarTecla = (e) => {
    if (e.key === "Escape") alCancelar();
  };

  return (
    <Fondo onKeyDown={alPresionarTecla} onMouseDown={(e) => e.target === e.currentTarget && alCancelar()}>
      <Cuadro role="alertdialog" aria-modal="true" aria-describedby="texto-confirmacion">
        <Texto id="texto-confirmacion">{mensaje}</Texto>
        <Acciones>
          <Accion type="button" ref={botonCancelar} onClick={alCancelar}>
            Cancelar
          </Accion>
          <Accion type="button" peligro onClick={alConfirmar}>
            {textoConfirmar}
          </Accion>
        </Acciones>
      </Cuadro>
    </Fondo>
  );
};

export default DialogoConfirmacion;
