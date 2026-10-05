import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";

const dibujar = keyframes`from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; }`;
const aparecer = keyframes`from { opacity: 0; } to { opacity: 1; }`;

const Contenedor = styled.div`
  position: relative;
  width: 100%;
  outline: 0;
  border-radius: 0.75rem;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 4px;
  }
`;

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  touch-action: pan-y;

  .linea {
    stroke-dasharray: 1;
    animation: ${dibujar} 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
  }

  .area,
  .punto {
    animation: ${aparecer} 0.6s ease 0.7s both;
  }

  @media (prefers-reduced-motion: reduce) {
    .linea,
    .area,
    .punto {
      animation: none;
      stroke-dasharray: none;
    }
  }
`;

const Globo = styled.div`
  position: absolute;
  top: 0;
  transform: translate(${(p) => p.$anclaje}, -115%); /* se ancla a los lados para no salirse de la gráfica */
  padding: 0.3rem 0.6rem;
  border-radius: 0.6rem;
  background: ${theme.tinta};
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
`;

let contador = 0; //React 17 no tiene useId: cada gráfica obtiene un id único para su degradado

const ANCHO = 600;
const ALTO = 200;
const RELLENO = { x: 8, arriba: 24, abajo: 8 };

//Curva suave (Catmull-Rom → Bézier) que pasa por todos los puntos
const trazoSuave = (pts) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
};

//Gasto acumulado del mes. Se puede explorar con el dedo/ratón o con las flechas del teclado.
const GraficaLinea = ({ datos, seleccionado, alSeleccionar, etiquetaMes = "" }) => {
  const id = useRef(null);
  if (id.current === null) id.current = `degradado-${++contador}`;
  const idDegradado = id.current;
  if (!datos.length) return null;

  const maximo = Math.max(...datos.map((d) => d.acumulado), 1);
  const paso = datos.length > 1 ? (ANCHO - RELLENO.x * 2) / (datos.length - 1) : 0;
  const pts = datos.map((d, i) => ({
    x: RELLENO.x + i * paso,
    y: ALTO - RELLENO.abajo - (d.acumulado / maximo) * (ALTO - RELLENO.arriba - RELLENO.abajo),
  }));
  const trazo = trazoSuave(pts);
  const area = `${trazo} L${pts[pts.length - 1].x},${ALTO} L${pts[0].x},${ALTO} Z`;
  const indice = Math.min(Math.max(seleccionado, 0), datos.length - 1);
  const activo = datos[indice];
  const punto = pts[indice];

  const elegirPorPuntero = (e) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - caja.left) / caja.width;
    alSeleccionar(Math.round(rel * (datos.length - 1)));
  };

  const alTeclear = (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); alSeleccionar(Math.max(0, indice - 1)); }
    if (e.key === "ArrowRight") { e.preventDefault(); alSeleccionar(Math.min(datos.length - 1, indice + 1)); }
    if (e.key === "Home") { e.preventDefault(); alSeleccionar(0); }
    if (e.key === "End") { e.preventDefault(); alSeleccionar(datos.length - 1); }
  };

  const resumen = `Gasto acumulado${etiquetaMes ? ` de ${etiquetaMes}` : ""}: ${ConvertirAMoneda(activo.acumulado)} hasta el día ${activo.dia}`;

  return (
    <Contenedor tabIndex={0} role="img" aria-label={`${resumen}. Usa las flechas para cambiar de día.`} onKeyDown={alTeclear}>
      <Globo $anclaje={punto.x / ANCHO > 0.72 ? "-100%" : punto.x / ANCHO < 0.12 ? "0%" : "-50%"} style={{ left: `${(punto.x / ANCHO) * 100}%`, top: `${(punto.y / ALTO) * 100}%` }}>
        Día {activo.dia} · {ConvertirAMoneda(activo.acumulado)}
      </Globo>
      <Svg viewBox={`0 0 ${ANCHO} ${ALTO}`} onPointerMove={elegirPorPuntero} onPointerDown={elegirPorPuntero} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.colorPrimario} stopOpacity="0.28" />
            <stop offset="1" stopColor={theme.colorPrimario} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="area" d={area} fill={`url(#${idDegradado})`} />
        <path className="linea" d={trazo} pathLength="1" fill="none" stroke={theme.colorPrimario} strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={punto.x} x2={punto.x} y1={punto.y} y2={ALTO} stroke={theme.colorPrimario} strokeOpacity="0.35" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        <circle className="punto" cx={punto.x} cy={punto.y} r="6" fill="#fff" stroke={theme.colorPrimario} strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </Svg>
    </Contenedor>
  );
};

export default GraficaLinea;
