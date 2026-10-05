import React from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import theme from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import useObtenerGasto from "../../Hooks/useObtenerGasto";
import RegistroRapido from "../gastos/RegistroRapido";
import { IconoRegresar } from "../iconos";
import { BotonEnlace } from "../auth/elementos";

const Caja = styled.div`
  max-width: 36rem;
  margin: 0 auto;

  h1 {
    margin: 0.25rem 0 1.25rem;
    font-size: clamp(1.6rem, 6vw, 2.1rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${theme.tinta};
  }
`;

const Tarjeta = styled.div`
  padding: 1.25rem;
  border-radius: 1.5rem;
  background: #fff;
  border: 1px solid ${theme.borde};
`;

//Editar un gasto: reutiliza el mismo formulario del registro rápido
const PaginaEditar = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [gasto] = useObtenerGasto(id);

  //Un gasto de otra persona no se puede editar: se vuelve a la lista
  if (gasto && gasto.uidUsuario !== usuario.uid) {
    navigate("/lista", { replace: true });
    return null;
  }

  return (
    <Caja>
      <Helmet>
        <title>Editar gasto · Finanzas</title>
      </Helmet>
      <BotonEnlace type="button" onClick={() => navigate("/lista")}>
        <IconoRegresar tam={16} /> Volver a la lista
      </BotonEnlace>
      <h1>Editar gasto</h1>
      <Tarjeta aria-busy={!gasto}>
        {gasto ? <RegistroRapido gasto={{ ...gasto, id }} idPrefijo="editar" /> : <p role="status">Cargando…</p>}
      </Tarjeta>
    </Caja>
  );
};

export default PaginaEditar;
