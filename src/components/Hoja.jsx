import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styled, { keyframes } from "styled-components";
import { useDrag } from "@use-gesture/react";
import theme from "../theme";
import { IconoCerrar } from "./iconos";

const SALIDA_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

const aparecerFondo = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const subir = keyframes`from { transform: translateY(100%); } to { transform: none; }`;
const aparecerModal = keyframes`from { opacity: 0; transform: translateY(1rem) scale(0.98); } to { opacity: 1; transform: none; }`;

const Fondo = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(20, 22, 31, 0.45);
  overscroll-behavior: contain;
  animation: ${aparecerFondo} 0.25s ease both;

  @media (min-width: 60rem) {
    align-items: center;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Caja = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 34rem;
  max-height: 92vh;
  max-height: 92dvh;
  background: #fff;
  border-radius: 1.75rem 1.75rem 0 0;
  box-shadow: 0 -12px 40px rgba(20, 22, 31, 0.2);
  animation: ${subir} 0.45s ${SALIDA_EXPO} both;
  outline: 0;

  @media (min-width: 60rem) {
    border-radius: 1.5rem;
    max-width: ${(p) => p.$ancho || "34rem"};
    box-shadow: 0 24px 60px rgba(20, 22, 31, 0.28);
    animation: ${aparecerModal} 0.35s ${SALIDA_EXPO} both;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Asa = styled.div`
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 1.75rem;
  cursor: grab;
  touch-action: none;
  flex-shrink: 0;

  &::before {
    content: "";
    width: 2.75rem;
    height: 0.3rem;
    border-radius: 999px;
    background: #cfd5dd;
  }

  @media (min-width: 60rem) {
    display: none;
  }
`;

const Cabecera = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 1.5rem 1rem;

  @media (min-width: 60rem) {
    padding-top: 1.5rem;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.15rem;
    font-size: 0.875rem;
    color: ${theme.tintaSuave};
  }
`;

const BotonCerrar = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 50%;
  background: ${theme.campo};
  color: ${theme.tinta};
  cursor: pointer;
  touch-action: manipulation;

  &:hover {
    background: #e8ecf0;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const Cuerpo = styled.div`
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 1.5rem max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem));
`;

let contadorHojas = 0; //React 17 no tiene useId: cada hoja obtiene un id único para su título

const FOCOS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

//Diálogo accesible: hoja que sube desde abajo en móvil y modal centrado en escritorio.
//Se cierra con Escape, tocando fuera, con el botón ✕ o arrastrando hacia abajo (móvil).
//El foco entra al abrir, se queda dentro y vuelve al botón que lo abrió al cerrar.
const Hoja = ({ abierta, alCerrar, titulo, subtitulo, ancho, children, rol = "dialog" }) => {
  const caja = useRef(null);
  const previo = useRef(null);
  const [arrastre, cambiarArrastre] = useState(0);
  const idTitulo = useRef(null);
  if (idTitulo.current === null) idTitulo.current = `hoja-titulo-${++contadorHojas}`;

  useEffect(() => {
    if (!abierta) return undefined;
    previo.current = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    //Se enfoca el primer campo; si no hay, el propio diálogo
    const primero = caja.current && caja.current.querySelector("input, textarea, select");
    (primero || caja.current).focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previo.current && previo.current.focus) previo.current.focus();
    };
  }, [abierta]);

  const gestos = useDrag(
    ({ active, last, movement: [, my], velocity: [, vy] }) => {
      if (active) cambiarArrastre(Math.max(0, my));
      if (last) {
        if (my > 110 || (vy > 0.6 && my > 30)) alCerrar();
        cambiarArrastre(0);
      }
    },
    { axis: "y", filterTaps: true, pointer: { touch: true } }
  );

  if (!abierta) return null;

  const alTeclear = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      alCerrar();
      return;
    }
    if (e.key !== "Tab") return;
    const focos = Array.from(caja.current.querySelectorAll(FOCOS));
    if (!focos.length) return;
    const primero = focos[0];
    const ultimo = focos[focos.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  return ReactDOM.createPortal(
    <Fondo onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <Caja
        ref={caja}
        role={rol}
        aria-modal="true"
        aria-labelledby={idTitulo.current}
        tabIndex={-1}
        $ancho={ancho}
        onKeyDown={alTeclear}
        style={arrastre ? { transform: `translateY(${arrastre}px)`, transition: "none" } : undefined}
      >
        <Asa {...gestos()} aria-hidden="true" />
        <Cabecera>
          <div>
            <h2 id={idTitulo.current}>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <BotonCerrar type="button" onClick={alCerrar} aria-label="Cerrar">
            <IconoCerrar />
          </BotonCerrar>
        </Cabecera>
        <Cuerpo>{children}</Cuerpo>
      </Caja>
    </Fondo>,
    document.body
  );
};

export default Hoja;
