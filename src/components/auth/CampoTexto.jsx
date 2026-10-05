import React from "react";
import styled from "styled-components";
import theme from "../../theme";

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const Etiqueta = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.tinta};
`;

const Caja = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem; /* 52px: objetivo táctil cómodo */
  padding: 0 0.5rem 0 1.1rem;
  background: ${theme.campo};
  border: 1px solid ${(p) => (p.$error ? theme.rojo : theme.bordeCampo)};
  border-radius: 999px;
  color: ${theme.tintaSuave};
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;

  &:focus-within {
    background: #fff;
    border-color: ${(p) => (p.$error ? theme.rojo : theme.colorPrimario)};
    box-shadow: 0 0 0 3px ${(p) => (p.$error ? "rgba(227, 71, 71, 0.2)" : "rgba(91, 105, 226, 0.22)")};
  }
`;

const Entrada = styled.input`
  flex: 1;
  min-width: 0;
  height: 3.1rem;
  border: 0;
  outline: 0; /* el foco se muestra en la caja (:focus-within) */
  background: transparent;
  font: inherit;
  font-size: 1rem;
  color: ${theme.tinta};
  caret-color: ${theme.colorPrimario};

  &::placeholder {
    color: ${theme.placeholder};
    opacity: 1;
  }
`;

const Ayuda = styled.p`
  font-size: 0.8125rem;
  line-height: 1.35;
  color: ${(p) => (p.$error ? "#B42323" : theme.tintaSuave)};
  padding-left: 0.4rem;
`;

//Campo con etiqueta visible arriba, icono a la izquierda y, opcionalmente, un botón a la derecha
//(p. ej. mostrar/ocultar contraseña). El error y la ayuda se enlazan con aria-describedby.
const CampoTexto = React.forwardRef(
  ({ id, etiqueta, icono, derecha, error, ayuda, ...entrada }, ref) => {
    const idMensaje = error || ayuda ? `${id}-mensaje` : undefined;
    return (
      <Contenedor>
        <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
        <Caja $error={Boolean(error)}>
          {icono}
          <Entrada
            id={id}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={idMensaje}
            {...entrada}
          />
          {derecha}
        </Caja>
        {(error || ayuda) && (
          <Ayuda id={idMensaje} $error={Boolean(error)} role={error ? "alert" : undefined}>
            {error || ayuda}
          </Ayuda>
        )}
      </Contenedor>
    );
  }
);

export default CampoTexto;
