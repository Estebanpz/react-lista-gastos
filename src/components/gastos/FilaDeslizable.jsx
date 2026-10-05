import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useDrag } from "@use-gesture/react";
import theme from "../../theme";
import { IconoEditar, IconoBorrar } from "../iconos";

const ANCHO_ACCIONES = 144;

const Contenedor = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 1.1rem;
  /* meses con muchos gastos: el navegador no pinta las filas fuera de pantalla */
  content-visibility: auto;
  contain-intrinsic-size: auto 4.75rem;
`;

const Acciones = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  width: ${ANCHO_ACCIONES}px;
  /* Cerrada, la fila tapa las acciones: se ocultan del todo (si no, asoman por el antialias de las
     esquinas redondeadas y quedan enfocables con el teclado aunque no se vean) */
  visibility: ${(p) => (p.$visibles ? "visible" : "hidden")};
`;

const Accion = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  border: 0;
  background: ${(p) => p.$fondo};
  color: #fff;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: -3px;
  }
`;

const Frente = styled.div`
  position: relative;
  background: ${(p) => (p.$seleccionada ? theme.violetaSuave : "#fff")};
  transition: ${(p) => (p.$arrastrando ? "none" : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease")};
  touch-action: pan-y;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

//Fila que se desliza hacia la izquierda con el dedo para mostrar «Editar» y «Borrar».
//Es una mejora táctil: las mismas acciones están siempre disponibles al abrir el detalle.
const FilaDeslizable = ({ children, seleccionada, alElegir, alEditar, alBorrar, abierta, alCambiarAbierta }) => {
  const [desplazamiento, cambiarDesplazamiento] = useState(0);
  const [arrastrando, cambiarArrastrando] = useState(false);

  //Si otra fila se abre, esta se cierra
  useEffect(() => {
    if (!abierta) cambiarDesplazamiento(0);
  }, [abierta]);

  const gestos = useDrag(
    ({ active, last, offset: [ox], movement: [mx], velocity: [vx], tap }) => {
      if (tap) return;
      if (active) {
        cambiarArrastrando(true);
        cambiarDesplazamiento(Math.max(-ANCHO_ACCIONES, Math.min(0, ox)));
      }
      if (last) {
        cambiarArrastrando(false);
        const abrir = ox < -ANCHO_ACCIONES / 2 || (vx > 0.4 && mx < 0);
        cambiarDesplazamiento(abrir ? -ANCHO_ACCIONES : 0);
        alCambiarAbierta(abrir);
      }
    },
    { axis: "x", filterTaps: true, threshold: 10, pointer: { touch: true }, from: () => [abierta ? -ANCHO_ACCIONES : 0, 0], bounds: { left: -ANCHO_ACCIONES - 24, right: 0 }, rubberband: 0.1 }
  );

  const alPulsar = () => {
    if (abierta) {
      alCambiarAbierta(false);
      return;
    }
    alElegir();
  };

  return (
    <Contenedor>
      <Acciones aria-hidden={!abierta} $visibles={abierta || arrastrando || desplazamiento !== 0}>
        <Accion type="button" $fondo="#4352c9" tabIndex={abierta ? 0 : -1} onClick={alEditar}>
          <IconoEditar tam={20} /> Editar
        </Accion>
        <Accion type="button" $fondo="#b42323" tabIndex={abierta ? 0 : -1} onClick={alBorrar}>
          <IconoBorrar tam={20} /> Borrar
        </Accion>
      </Acciones>
      <Frente $arrastrando={arrastrando} $seleccionada={seleccionada} style={{ transform: `translateX(${desplazamiento}px)` }} {...gestos()}>
        <button
          type="button"
          onClick={alPulsar}
          aria-current={seleccionada ? "true" : undefined}
          style={{ display: "block", width: "100%", padding: "0.85rem 0.9rem", border: 0, background: "transparent", font: "inherit", textAlign: "left", cursor: "pointer", borderRadius: "1.1rem", color: "inherit" }}
        >
          {children}
        </button>
      </Frente>
    </Contenedor>
  );
};

export default FilaDeslizable;
