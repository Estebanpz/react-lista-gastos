import React from "react";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";

//Cada segmento se dibuja creciendo desde cero hasta su largo final (el desplazamiento fijo lo coloca en su sitio)
const barrer = keyframes`from { stroke-dasharray: 0 var(--total); } to { stroke-dasharray: var(--visible) var(--resto); }`;

const Caja = styled.div`
  position: relative;
  width: min(100%, 15rem);
  margin: 0 auto;
`;

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  transform: rotate(-90deg);

  circle.segmento {
    animation: ${barrer} 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @media (prefers-reduced-motion: reduce) {
    circle.segmento {
      animation: none;
    }
  }
`;

const Centro = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;

  small {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  strong {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
  }
`;

const R = 42;
const LARGO = 2 * Math.PI * R;

//Dona de participación por categoría. `segmentos` = [{id, valor, color}] (el color es un hex).
const Dona = ({ segmentos, etiquetaTotal, textoTotal, descripcion }) => {
  const suma = segmentos.reduce((a, s) => a + s.valor, 0) || 1;
  let acumulado = 0;
  return (
    <Caja role="img" aria-label={descripcion}>
      <Svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke={theme.campo} strokeWidth="13" />
        {segmentos.map((s, i) => {
          const parte = (s.valor / suma) * LARGO;
          const hueco = segmentos.length > 1 ? 1.2 : 0;
          const visible = Math.max(parte - hueco, 0.01);
          const desplazamiento = -acumulado;
          acumulado += parte;
          return (
            <circle
              key={s.id}
              className="segmento"
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="13"
              strokeLinecap="butt"
              strokeDasharray={`${visible} ${LARGO - visible}`}
              style={{ strokeDashoffset: desplazamiento, "--visible": visible, "--resto": LARGO - visible, "--total": LARGO, animationDelay: `${i * 0.07}s` }}
            />
          );
        })}
      </Svg>
      <Centro>
        <small>{etiquetaTotal}</small>
        <strong>{textoTotal}</strong>
      </Centro>
    </Caja>
  );
};

export default Dona;
