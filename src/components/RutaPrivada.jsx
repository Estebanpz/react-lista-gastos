import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const RutaPrivada = ({ children }) => {
    const { usuario } = useAuth();
    if (usuario) {
        return children;
    } else {
        return <Navigate replace to="/inicio-sesion" />
    }
}

export default RutaPrivada;