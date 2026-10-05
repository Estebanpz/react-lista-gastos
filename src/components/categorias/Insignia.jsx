import React from "react";
import styled from "styled-components";
import { colorPorId } from "../../functions/paleta";
import IconoCat from "./iconos";

const Cuadro = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(p) => p.$tam}rem;
  height: ${(p) => p.$tam}rem;
  border-radius: ${(p) => p.$tam * 0.3}rem;
  background: ${(p) => p.$fondo};
  color: ${(p) => p.$oscuro};
`;

//Cuadro con el icono de la categoría sobre un tinte de su color
const Insignia = ({ categoria, tam = 2.75 }) => {
  const color = colorPorId(categoria.color);
  return (
    <Cuadro $tam={tam} $fondo={`${color.base}29`} $oscuro={color.oscuro}>
      <IconoCat clave={categoria.icono} tam={Math.round(tam * 8)} />
    </Cuadro>
  );
};

export default Insignia;
