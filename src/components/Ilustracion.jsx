import React from "react";
import styled from "styled-components";

//Ilustraciones de unDraw (https://undraw.co), recoloreadas con el violeta de la marca.
//Se cargan como <img> (no se incrustan en el JS) y son decorativas: el texto de al lado explica todo.
import sinGastos from "../img/undraw/sin-gastos.svg";
import sinResultados from "../img/undraw/sin-resultados.svg";
import borrar from "../img/undraw/borrar.svg";
import guardado from "../img/undraw/guardado.svg";
import categorias from "../img/undraw/categorias.svg";
import categoriaNueva from "../img/undraw/categoria-nueva.svg";
import sinConexion from "../img/undraw/sin-conexion.svg";

const ARCHIVOS = {
  "sin-gastos": sinGastos,
  "sin-resultados": sinResultados,
  borrar,
  guardado,
  categorias,
  "categoria-nueva": categoriaNueva,
  "sin-conexion": sinConexion,
};

const Img = styled.img`
  display: block;
  width: ${(p) => p.$ancho};
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  user-select: none;
  -webkit-user-drag: none;
`;

const Ilustracion = ({ nombre, ancho = "11rem", ...resto }) => (
  <Img src={ARCHIVOS[nombre]} alt="" width="320" height="240" loading="lazy" decoding="async" $ancho={ancho} {...resto} />
);

export default Ilustracion;
