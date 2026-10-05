import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import theme from "../theme";
import { suscribirActualizacion, aplicarActualizacion } from "../pwa/registroServiceWorker";

const aparecer = keyframes`
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: translateY(0); }
`;

const Aviso = styled.div`
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 1600;
  width: 90%;
  max-width: 28rem;
  background: #000;
  color: #fff;
  border-radius: 0.625rem; /* 10px */
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0px 0.5rem 1.5rem rgba(0, 0, 0, 0.25);
  animation: ${aparecer} 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Acciones = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const Accion = styled.button`
  border: none;
  border-radius: 0.375rem;
  padding: 0.6rem 0.9rem;
  font-family: "Work Sans", sans-serif;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  color: ${(props) => (props.primaria ? "#fff" : "#000")};
  background: ${(props) => (props.primaria ? theme.colorPrimario : theme.grisClaro)};

  &:focus-visible {
    outline: 3px solid ${theme.azulClaro};
    outline-offset: 2px;
  }
`;

//Aviso «Hay una versión nueva». No roba el foco y no se aplica sola:
//«Actualizar» activa la versión nueva y recarga; «Más tarde» lo oculta hasta la próxima visita.
const AvisoActualizacion = () => {
  const [hayVersionNueva, cambiarHayVersionNueva] = useState(false);
  const [descartado, cambiarDescartado] = useState(false);

  useEffect(() => suscribirActualizacion(cambiarHayVersionNueva), []);

  if (!hayVersionNueva || descartado) return null;

  return (
    <Aviso role="status">
      <span>Hay una versión nueva de la app.</span>
      <Acciones>
        <Accion type="button" onClick={() => cambiarDescartado(true)}>
          Más tarde
        </Accion>
        <Accion type="button" primaria onClick={() => aplicarActualizacion()}>
          Actualizar
        </Accion>
      </Acciones>
    </Aviso>
  );
};

export default AvisoActualizacion;
