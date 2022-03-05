import React, {useEffect} from "react";
import { Helmet } from "react-helmet";
import { Header, Titulo } from "../elementos/Header";
import BtnRegresar from "../elementos/BtnRegresar";
import BarraTotalGastado from "./BarraTotalGastado";
import useObtenerGastosDelMesCategoria from "../Hooks/useObtenerGastosDelMesCategoria";
import {ListaDeCategorias,ElementoListaCategorias, Categoria, Valor } from "./../elementos/ElementosDeLista";
import FormatearCantidad from "../functions/ConvertirAMoneda";
import IconoCategoria from "./../elementos/IconoCategoria";
const GastosPorCategoria = () => {
const gastosPorCategoria = useObtenerGastosDelMesCategoria();
  useEffect(() => {
    console.log(gastosPorCategoria);
  }, [gastosPorCategoria]);
  return (
    <>
      <Helmet>
        <title>Gastos por Categoria</title>
      </Helmet>

      <Header>
        <BtnRegresar ruta="/" />
        <Titulo>Gastos por Categoria</Titulo>
      </Header>
      <ListaDeCategorias>
        {
          gastosPorCategoria.map((gasto, index)=>{
            console.log(gasto.cantidad);
            return(
              <ElementoListaCategorias key={index}>
                <Categoria>
                  <IconoCategoria id={gasto.categoria} />
                  {gasto.categoria}
                </Categoria>
                <Valor>{FormatearCantidad(gasto.cantidad)}</Valor>
              </ElementoListaCategorias>
            )
          })
        }
      </ListaDeCategorias>
     <BarraTotalGastado />
    </>
  );
};

export default GastosPorCategoria;
