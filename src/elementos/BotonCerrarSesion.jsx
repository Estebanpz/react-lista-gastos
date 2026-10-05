import React from 'react';
import Boton from './Boton';
import {ReactComponent as IconoCerrarSesion} from"./../img/log-out.svg";
import cerrarSesion from "./../firebase/cerrarSesion";

const BotonCerrarSesion = () => {
    return (
        <Boton as="button" type="button" iconoGrande aria-label="Cerrar sesión" onClick={() => cerrarSesion()}>
            <IconoCerrarSesion aria-hidden="true" />
        </Boton>
     );
}
 
export default BotonCerrarSesion;
