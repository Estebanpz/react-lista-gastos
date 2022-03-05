import { useState, useEffect } from 'react';
import { db, query, collection, orderBy, onSnapshot, where } from "./../firebase/firebaseConfig";
//Importando la librerias para las fechas
import { endOfMonth, startOfMonth, getUnixTime } from 'date-fns';

//Importando el useAuth para traer los datos del usuario
import { useAuth } from "./../contexts/AuthContext";
const useObtenerGastosMes = () => {
    const [gastos, setGastos] = useState([]);
    const { usuario } = useAuth();

    useEffect(() => {
        //Obteniendo el inicio y fin de mes por la libreria
        const inicioDeMes = getUnixTime(startOfMonth(new Date()));
        const finDeMes = getUnixTime(endOfMonth(new Date()));
        if(usuario){
            //Creando la consulta a la base de datos
                let consulta = query(
                    collection(db, "gastos"),
                    orderBy("fecha", "desc"),
                    where('fecha', '>=', inicioDeMes),
                    where('fecha', '<=', finDeMes),
                    where('uidUsuario', '==', usuario.uid)
                );
                //Ejecutando la consulta
                const unSubscribe = onSnapshot(consulta, (snapshot) => {
                    
                    const gastos = snapshot.docs.map((doc) => {
                        return {
                            id: doc.id,
                            ...doc.data()
                        }
                    });
                    setGastos(gastos);
                }, (error) => {
                    console.log(error);
                });
    
            return () => unSubscribe();
        }else{
            return;
        }
    }, [usuario]);

    return [gastos];
}

export default useObtenerGastosMes;