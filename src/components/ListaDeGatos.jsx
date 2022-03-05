import React from "react";
import Helmet from "react-helmet";
import BtnRegresar from "../elementos/BtnRegresar";
import { Header, Titulo } from "../elementos/Header";
import BarraTotalGastado from "./BarraTotalGastado";
//import { useAuth } from "../contexts/AuthContext";
import useObtenerGastos from "../Hooks/useObtenerGastos";
import BorrarGasto from "./../firebase/BorrarGasto";
import { fromUnixTime, format } from "date-fns";
import {
  Lista,
  ElementoLista,
  Categoria,
  Descripcion,
  Valor,
  Fecha,
  ContenedorBotones,
  BotonAccion,
  BotonCargarMas,
  ContenedorBotonCentral,
  ContenedorSubtitulo,
  Subtitulo,
} from "../elementos/ElementosDeLista";

import IconoCategoria from "../elementos/IconoCategoria";
import ConvertirAMoneda from "./../functions/ConvertirAMoneda";
import { ReactComponent as IconoEditar } from "./../img/editar.svg";
import { ReactComponent as IconoBorrar } from "./../img/borrar.svg";
import Boton from "../elementos/Boton";
import { Link } from "react-router-dom";
import { es } from "date-fns/locale";

const ListaDeGastos = () => {
  //const { usuario } = useAuth();
  const [gastos, obtenerMasGastos, hayMasPorCargar] = useObtenerGastos();
  console.log(gastos);

  const formatearFecha = (fecha) => {
    return format(fromUnixTime(fecha), "dd 'de' MMMM 'de' yyyy", {
      locale: es,
    });
  };

  const fechaEsIgual = (gastos, index, gasto) => {
    if (index !== 0) {
      const fechaActual = formatearFecha(gasto.fecha);
      const fechaAnterior = formatearFecha(gastos[index - 1].fecha);

      if (fechaActual === fechaAnterior) {
        return true;
      } else return false;
    }
  };

  return (
    <>
      <Helmet>
        <title>Lista de Gastos</title>
      </Helmet>

      <Header>
        <BtnRegresar ruta="/" />
        <Titulo>Lista de Gastos</Titulo>
      </Header>
      <Lista>
        {gastos.map((gasto, index) => (
          <div key={gasto.id}>
            {!fechaEsIgual(gastos, index, gasto) && (
              <Fecha>{formatearFecha(gasto.fecha)}</Fecha>
            )}

            <ElementoLista>
              <Categoria>
                <IconoCategoria id={gasto.categoria} />
                {gasto.categoria}
              </Categoria>
              <Descripcion>{gasto.descripcion}</Descripcion>
              <Valor>{ConvertirAMoneda(gasto.cantidad)}</Valor>
              {/*BOTONES DE EDITAR Y BORRAR */}
              <ContenedorBotones>
                <BotonAccion as={Link} to={`/editar-gasto/${gasto.id}`}>
                  <IconoEditar />
                </BotonAccion>
                <BotonAccion onClick={() => BorrarGasto(gasto.id)}>
                  <IconoBorrar />
                </BotonAccion>
              </ContenedorBotones>
              {/* TERMINAN LOS BOTONES DE EDITAR Y BORRAR*/}
            </ElementoLista>
          </div>
        ))}
        {/* BOTON CARGAR MAS*/}
        {
          hayMasPorCargar &&
          <ContenedorBotonCentral>
            <BotonCargarMas onClick={() => obtenerMasGastos()}>
              Cargar Más
            </BotonCargarMas>
          </ContenedorBotonCentral>
        }

        {/* TERMINA BOTON CARGAR MAS*/}
        {/* VALIDAMOS SI HAY GASTOS O NO*/}
        {gastos.length === 0 && (
          <ContenedorSubtitulo>
            <Subtitulo>No hay gastos registrados</Subtitulo>
            <Boton to="/">Agregar Gasto</Boton>
          </ContenedorSubtitulo>
        )}
      </Lista>
      <BarraTotalGastado />
    </>
  );
};

export default ListaDeGastos;
