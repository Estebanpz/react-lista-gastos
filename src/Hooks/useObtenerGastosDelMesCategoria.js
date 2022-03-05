import { useState, useEffect } from 'react';
import useObtenerGastosMes from './useObtenerGastosMes';

const useObtenerGastosDelMesCategoria = () => {
    const [gastosPorCategoria, setGastosPorCategoria] = useState([]);
    const [gastos] = useObtenerGastosMes();
    
    useEffect(()=>{
        const sumaDeGastos = gastos.reduce((objetoResultante, objetoActual) => {
            const categoriaActual = objetoActual.categoria;
            const cantidadActual = objetoActual.cantidad;
            objetoResultante[categoriaActual] += cantidadActual;
            return objetoResultante;
        }, {
            'comida': 0,
            'cuentas y pagos': 0,
            'hogar': 0,
            'transporte': 0,
            'ropa': 0,
            'salud e higiene': 0,
            'compras': 0,
            'diversion': 0,
        });
        //console.log(sumaDeGastos);
        setGastosPorCategoria(Object.keys(sumaDeGastos).map((categoria)=>{
            return {
                categoria,
                cantidad: sumaDeGastos[categoria]
            }
        }));
        return () => setGastosPorCategoria([]);
    }, [gastos]);

    return gastosPorCategoria;
}

export default useObtenerGastosDelMesCategoria;