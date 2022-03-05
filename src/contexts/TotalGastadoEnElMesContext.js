import React, { useState, useEffect, useContext } from "react";
import useObtenerGastosDelMes from "./../Hooks/useObtenerGastosMes";

const TotalGastadoContext = React.createContext();

//Hook para obtener el contexto de Total Gastado
const useTotalGastado = () => {
    return useContext(TotalGastadoContext);
};

const TotalGastadoProvider = ({ children }) => {
    const [totalGastado, setTotalGastado] = useState(0);
    const [gastos] = useObtenerGastosDelMes();
    useEffect(()=>{
      let acumulador = 0;
     /* 
        gastos.forEach((gasto) =>{
          acumulador += Number(gasto.cantidad);
      });
     */
      gastos.reduce((acc, gasto)=>{
        acumulador += Number(gasto.cantidad);
        return acumulador;
      }, acumulador);
      setTotalGastado(acumulador);
  }, [gastos]);


  return (
    <TotalGastadoContext.Provider value={{totalGastado, setTotalGastado}}>
        {
         children
        }
    </TotalGastadoContext.Provider>
  );
};
export { TotalGastadoContext, TotalGastadoProvider, useTotalGastado };
