import styled from "styled-components";
import theme from "../../theme";

//Piezas de formulario de las hojas de pagos (mismo lenguaje visual que CrearCategoria y RegistroRapido)
export const Formulario = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const Etiqueta = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${theme.tintaSuave};
`;

export const Grupo = styled.fieldset`
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
`;

export const Entrada = styled.input`
  width: 100%;
  min-height: 3.25rem;
  padding: 0 1.1rem;
  border: 1px solid ${(p) => (p.$error ? theme.rojo : theme.bordeCampo)};
  border-radius: 999px;
  background: ${theme.campo};
  font: inherit;
  font-size: 1rem;
  color: ${theme.tinta};
  caret-color: ${theme.colorPrimario};

  &::placeholder {
    color: ${theme.placeholder};
    opacity: 1;
  }

  &:focus-visible {
    outline: 0;
    background: #fff;
    border-color: ${theme.colorPrimario};
    box-shadow: 0 0 0 3px rgba(91, 105, 226, 0.22);
  }
`;

export const Seleccion = styled.select`
  width: 100%;
  min-height: 3.25rem;
  padding: 0 1.1rem;
  border: 1px solid ${theme.bordeCampo};
  border-radius: 999px;
  background-color: ${theme.campo};
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.tinta};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

export const Ayuda = styled.p`
  margin-top: 0.35rem;
  padding-left: 0.4rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: ${(p) => (p.$error ? "#B42323" : theme.tintaSuave)};
`;

//Monto grande, igual que en el registro rápido
export const CajaMonto = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.4rem 1.1rem;
  border: 2px solid ${(p) => (p.$error ? theme.rojo : theme.bordeCampo)};
  border-radius: 1.25rem;
  background: #fff;

  &:focus-within {
    border-color: ${(p) => (p.$error ? theme.rojo : theme.colorPrimario)};
    box-shadow: 0 0 0 4px ${(p) => (p.$error ? "rgba(227,71,71,.18)" : "rgba(91,105,226,.2)")};
  }

  span {
    font-size: 1.6rem;
    font-weight: 800;
    color: ${theme.tintaSuave};
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: clamp(1.9rem, 8vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
    caret-color: ${theme.colorPrimario};
  }

  input::placeholder {
    color: #b9c0cc;
    opacity: 1;
  }
`;

//Control segmentado accesible (role=radiogroup con botones role=radio)
export const Segmentos = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid ${theme.borde};
  border-radius: 999px;
  background: ${theme.campo};

  button {
    min-height: 2.75rem;
    padding: 0 0.5rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: ${theme.tintaSuave};
    cursor: pointer;
    touch-action: manipulation;
  }

  button:hover:not([aria-checked="true"]) {
    color: ${theme.tinta};
    background: rgba(255, 255, 255, 0.6);
  }

  button[aria-checked="true"] {
    background: #fff;
    color: #3e4bc7;
    font-weight: 800;
    box-shadow: 0 2px 8px rgba(20, 22, 31, 0.1);
  }

  button:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

export const Chips = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0.25rem 0.5rem;
  margin: 0 -0.25rem;
  scrollbar-width: thin;
`;

export const Chip = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1rem 0 0.5rem;
  border: 2px solid ${(p) => (p.$marcado ? "#3e4bc7" : theme.borde)};
  border-radius: 999px;
  background: ${(p) => (p.$marcado ? "#3e4bc7" : "#fff")};
  color: ${(p) => (p.$marcado ? "#fff" : theme.tinta)};
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;

  &:hover {
    border-color: ${(p) => (p.$marcado ? "#2f3aa8" : theme.bordeCampo)};
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }
`;

//Botón secundario (texto) que acompaña al principal
export const BotonSecundario = styled.button`
  min-height: 3rem;
  padding: 0 1.25rem;
  border: 1px solid ${theme.borde};
  border-radius: 999px;
  background: #fff;
  font: inherit;
  font-weight: 700;
  color: ${theme.tinta};
  cursor: pointer;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    border-color: ${theme.bordeCampo};
    background: ${theme.campo};
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
