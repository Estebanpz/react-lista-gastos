import React from "react";
import { Navigate } from "react-router-dom";
import { useCliente } from "../contexts/ClienteContext";

//Las pantallas de uso personal (Inicio, Lista, Categorías, Pagos, Mi plan) son para clientes. El super admin no tiene
//plan ni gastos propios: si llega a una de ellas, va a su panel. Mientras no se sabe quién es, no se pinta nada.
const RutaDeCliente = ({ children }) => {
  const { cargando, esAdmin } = useCliente();
  if (cargando) return null;
  if (esAdmin) return <Navigate to="/admin" replace />;
  return children;
};

export default RutaDeCliente;
