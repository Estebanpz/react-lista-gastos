import React from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";
import BtnRegresar from "../elementos/BtnRegresar";
import { Header, Titulo } from "../elementos/Header";
import BarraTotalGastado from "./BarraTotalGastado";
import useObtenerGasto from "../Hooks/useObtenerGasto";
import FormularioGasto from "./../components/FormularioGasto";
import { useAuth } from "../contexts/AuthContext";
const EditarGasto = () => {
    const { id } = useParams();
    const [gasto] =  useObtenerGasto(id);
    const {usuario} = useAuth();
    console.log(gasto);
  return (

    <>
      <Helmet>
        <title>Editar Gasto</title>
      </Helmet>

      <Header>
        <BtnRegresar ruta="/lista"/>
        <Titulo>Editar Gasto</Titulo>
      </Header>
        <FormularioGasto gasto={gasto}/>

        {
          usuario &&
          <BarraTotalGastado />
        }
    </>
  );
};

export default EditarGasto;
