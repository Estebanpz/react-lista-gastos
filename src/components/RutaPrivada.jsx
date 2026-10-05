import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

//Sin sesión se va al acceso recordando la página pedida, para volver a ella al entrar
const RutaPrivada = ({ children }) => {
    const { usuario } = useAuth();
    const { pathname, search } = useLocation();
    if (usuario) {
        return children;
    } else {
        return <Navigate replace to="/inicio-sesion" state={{ desde: pathname + search }} />
    }
}

export default RutaPrivada;
