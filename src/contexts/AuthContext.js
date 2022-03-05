import React,{useContext, useState, useEffect} from 'react';
import {auth, onAuthStateChanged} from "./../firebase/firebaseConfig";
//Creamos el contexto este es el estado global
const AuthContext = React.createContext();


//Hooks que vamos a usar para conectarnos con el contexto
const useAuth = () =>{
    return useContext(AuthContext);
}
//Componente padre que engloba a la App y provee de este Contexto
const AuthProvider = ({children}) => {
    //Estado del usuario
    const [usuario, setUsuario] = useState();

    //Creamos un estado para saber cuando acaba de cargar el OnStateChanged del Auth
    //Y asi evitarnos unos Undefined
    const [cargandoUsuario, cambiarCargandoUsuario] = useState(true);

    //Cargando el UseEffect para verificar si hay un usuario o no
    useEffect(() =>{
        //Comprobamos si hay un usuario
         const cancelarSuscripcion = onAuthStateChanged(auth, (user) =>{
                setUsuario(user);
                cambiarCargandoUsuario(false);
         });

         return cancelarSuscripcion;
    },[]);

    return ( 
        <AuthContext.Provider value={{usuario, setUsuario}}>
            {/*Solamente se muestran los elementos hijos cuando ya no esté cargando
                el OnStateChanged del Auth*
            */}
            
            {!cargandoUsuario && children}
        </AuthContext.Provider>
     );
}
 
export {AuthContext, AuthProvider, useAuth};
