import React, { useMemo, useContext } from "react";
import useObtenerGastosDelMes from "./../Hooks/useObtenerGastosMes";

const TotalGastadoContext = React.createContext();

//Hook para obtener el contexto de Total Gastado
const useTotalGastado = () => {
    return useContext(TotalGastadoContext);
};

const TotalGastadoProvider = ({ children }) => {
    const [gastos] = useObtenerGastosDelMes();

    //El total se deriva de los gastos durante el render, no hace falta estado ni efecto
    const totalGastado = useMemo(
        () => gastos.reduce((acumulador, gasto) => acumulador + Number(gasto.cantidad), 0),
        [gastos]
    );

    //Se memoiza el valor para que los consumidores no se re-rendericen sin necesidad
    const valor = useMemo(() => ({ totalGastado }), [totalGastado]);

    return (
        <TotalGastadoContext.Provider value={valor}>
            {children}
        </TotalGastadoContext.Provider>
    );
};
export { TotalGastadoContext, TotalGastadoProvider, useTotalGastado };
