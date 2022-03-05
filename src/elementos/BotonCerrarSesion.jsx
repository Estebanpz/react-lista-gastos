import React from 'react';
import Boton from './Boton';
import { useNavigate } from 'react-router-dom';
import {ReactComponent as IconoCerrarSesion} from"./../img/log-out.svg";
import {auth, signOut} from "./../firebase/firebaseConfig";

const BotonCerrarSesion = () => {
    let navigate = useNavigate();
    const cerrarSesion = async() =>{
        try {
            await signOut(auth);
            alert("Sesión cerrada");
            navigate("/inicio-sesion");
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <Boton as="button" iconoGrande onClick={() => cerrarSesion()}>
            <IconoCerrarSesion />
        </Boton>
     );
}
 
export default BotonCerrarSesion;