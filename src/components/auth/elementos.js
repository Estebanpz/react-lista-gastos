import styled, { css, keyframes } from "styled-components";
import theme from "../../theme";

//Texto solo para lectores de pantalla
export const Oculto = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const girar = keyframes`
  to { transform: rotate(360deg); }
`;

export const Formulario = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const Fila = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const BotonPrincipal = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  min-height: 3.5rem;
  margin-top: 0.25rem;
  border: 0;
  border-radius: 999px;
  background: ${theme.colorPrimario};
  color: #fff;
  font: inherit;
  font-size: 1.0625rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(91, 105, 226, 0.28);
  transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    background: #4c5ad6;
  }

  &:active:not(:disabled) {
    transform: scale(0.985);
  }

  &:disabled {
    background: #C3C9F2;
    color: #4A5568;
    box-shadow: none;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 3px;
  }

  &[aria-busy="true"] {
    cursor: progress;
    background: #7480e8;
    box-shadow: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: background-color 0.2s ease;

    &:active {
      transform: none;
    }
  }
`;

export const Espera = styled.span`
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  animation: ${girar} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2.4s;
  }
`;

//Botón con aspecto de enlace (acciones que no navegan: «¿Olvidaste tu contraseña?», «Volver»…)
export const BotonEnlace = styled.button`
  min-height: 2.75rem;
  padding: 0 0.25rem;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #3e4bc7;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  touch-action: manipulation;

  &:hover {
    color: #2c379f;
  }

  &:focus-visible {
    outline: 3px solid ${theme.azulClaro};
    outline-offset: 2px;
    border-radius: 0.375rem;
  }
`;

const bloqueMensaje = css`
  padding: 0.75rem 1rem;
  border-radius: 0.875rem;
  font-size: 0.9375rem;
  line-height: 1.4;
`;

export const MensajeError = styled.p`
  ${bloqueMensaje}
  background: #fdecec;
  color: #8f1d1d;
`;

export const MensajeExito = styled.p`
  ${bloqueMensaje}
  background: ${theme.verdeSuave};
  color: ${theme.verdeTexto};
`;

export const Texto = styled.p`
  font-size: 0.9375rem;
  line-height: 1.5;
  color: ${theme.tintaSuave};
`;

export const BotonOjo = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${theme.tintaSuave};
  cursor: pointer;
  touch-action: manipulation;

  &:hover {
    background: rgba(20, 22, 31, 0.06);
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 0;
  }
`;
