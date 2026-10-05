import { useMemo } from 'react';
import useObtenerGastosMes from './useObtenerGastosMes';
import CATEGORIAS from '../functions/categorias';

const useObtenerGastosDelMesCategoria = () => {
    const [gastos] = useObtenerGastosMes();

    //Se deriva durante el render: un total por cada categoría conocida
    return useMemo(() => {
        const sumaDeGastos = {};
        CATEGORIAS.forEach(({ id }) => {
            sumaDeGastos[id] = 0;
        });

        gastos.forEach((gasto) => {
            if (gasto.categoria in sumaDeGastos) {
                sumaDeGastos[gasto.categoria] += Number(gasto.cantidad);
            }
        });

        return CATEGORIAS.map(({ id }) => ({
            categoria: id,
            cantidad: sumaDeGastos[id],
        }));
    }, [gastos]);
}

export default useObtenerGastosDelMesCategoria;
