import React, { useState } from "react";
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
import DialogoConfirmacion from "./DialogoConfirmacion";
import Alerta from "../elementos/Alerta";

const ListaDeGastos = () => {
  //const { usuario } = useAuth();
  const [gastos, obtenerMasGastos, hayMasPorCargar] = useObtenerGastos();
  //Gasto pendiente de confirmar su borrado y estado de la alerta de error
  const [gastoPorBorrar, cambiarGastoPorBorrar] = useState(null);
  const [estadoAlerta, cambiarEstadoAlerta] = useState(false);

  const confirmarBorrado = async () => {
    const { id } = gastoPorBorrar;
    cambiarGastoPorBorrar(null);
    try {
      await BorrarGasto(id);
    } catch (error) {
      console.log(error);
      cambiarEstadoAlerta(true);
    }
  };

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
                <BotonAccion
                  as={Link}
                  to={`/editar-gasto/${gasto.id}`}
                  aria-label={`Editar gasto: ${gasto.descripcion}`}
                >
                  <IconoEditar aria-hidden="true" />
                </BotonAccion>
                <BotonAccion
                  type="button"
                  aria-label={`Borrar gasto: ${gasto.descripcion}`}
                  onClick={() => cambiarGastoPorBorrar(gasto)}
                >
                  <IconoBorrar aria-hidden="true" />
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
            <BotonCargarMas type="button" onClick={() => obtenerMasGastos()}>
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

      {gastoPorBorrar && (
        <DialogoConfirmacion
          mensaje={`¿Borrar el gasto «${gastoPorBorrar.descripcion}» por ${ConvertirAMoneda(gastoPorBorrar.cantidad)}? Esta acción no se puede deshacer.`}
          alConfirmar={confirmarBorrado}
          alCancelar={() => cambiarGastoPorBorrar(null)}
        />
      )}
      <Alerta
        tipo="error"
        mensaje="No se pudo borrar el gasto. Revisa tu conexión e inténtalo de nuevo."
        estadoAlerta={estadoAlerta}
        cambiarEstadoAlerta={cambiarEstadoAlerta}
      />
    </>
  );
};

export default ListaDeGastos;
