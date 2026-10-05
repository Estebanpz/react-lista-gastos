import React from "react";
import styled from "styled-components";
import { colorPorId } from "../../functions/paleta";
import IconoCat from "./iconos";

//`&&&` sube la especificidad: los contenedores suelen tener reglas `span { display: block; … }` que, sin esto,
//le quitarían el centrado al icono (bug visto en el detalle del gasto).
const Cuadro = styled.span`
  &&& {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin: 0;
    padding: 0;
    text-transform: none;
    letter-spacing: 0;
  }

  width: ${(p) => p.$tam}rem;
  height: ${(p) => p.$tam}rem;
  border-radius: ${(p) => p.$tam * 0.3}rem;
  background: ${(p) => p.$fondo};
  color: ${(p) => p.$oscuro};
`;

//Cuadro con el icono de la categoría sobre un tinte de su color.
//`sobreColor`: va encima de un fondo de color sólido (p. ej. un chip seleccionado); el tinte translúcido se
//fundiría con él, así que se usa un cuadro blanco y el icono en el tono oscuro de la categoría.
const Insignia = ({ categoria, tam = 2.75, sobreColor = false }) => {
  const color = colorPorId(categoria.color);
  return (
    <Cuadro $tam={tam} $fondo={sobreColor ? "#fff" : `${color.base}29`} $oscuro={color.oscuro}>
      <IconoCat clave={categoria.icono} tam={Math.round(tam * 8)} />
    </Cuadro>
  );
};

export default Insignia;
