import React from 'react';
import { Helmet } from "react-helmet";
import {ContenedorHeader, Header, ContenedorBotones,Titulo} from "./elementos/Header";
import Boton from "./elementos/Boton";
import BotonCerrarSesion from "./elementos/BotonCerrarSesion";
import FormularioGasto from './components/FormularioGasto';
import BarraTotalGastado from './components/BarraTotalGastado';
import { useAuth } from './contexts/AuthContext';
const App = () => {
  const {usuario} = useAuth();
  return (
    <>
      <Helmet>
        <title>Agregar Gasto</title>
      </Helmet>

      <Header>
        <ContenedorHeader>
          <Titulo>Agregar Gasto</Titulo>
          <ContenedorBotones>
            <Boton to="/categorias">Categorias</Boton>
            <Boton to="/lista">Lista de Gastos</Boton>
            <BotonCerrarSesion iconoGrande>Salir</BotonCerrarSesion>
          </ContenedorBotones>
        </ContenedorHeader>
      </Header>

      <FormularioGasto />
      {
        usuario &&
        <BarraTotalGastado />
      }
    </>
  );
}

export default App;
