import React, { useState, useEffect } from "react";
import {
  Formulario,
  ContenedorFiltros,
  Input,
  InputGrande,
  ContenedorBoton,
} from "../elementos/ElementosDeFormulario";

import Boton from "./../elementos/Boton";
import { ReactComponent as IconoPlus } from "./../img/plus.svg";
import SelectCategoria from "./SelectCategorias";
//Funcion de agregar Gasto
import agregarGasto from "../firebase/AgregarGasto";
import { getUnixTime, fromUnixTime} from "date-fns";
import Alerta from "./../elementos/Alerta";
//Importando el AuthContext para crear el doc con el Id usuario
import { useAuth } from "./../contexts/AuthContext";
import DatePeacker from "./DatePeacker";
import { useNavigate, useParams } from "react-router-dom";
//Funcion para actualizar gasto
import actualizarGasto from "../firebase/ActualizarGasto";

function FormularioGasto({gasto}) {
  const [inputDescripcion, setInputDescripcion] = useState("");
  const [inputCantidad, setInputCantidad] = useState(0);
  const [Categoria, setCategoria] = useState("hogar");
  const [fecha, setFecha] = useState(new Date());
  //Estados de la Alerta
  const [estadoAlerta, cambiarEstadoAlerta] = useState(false);
  const [alerta, cambiarAlerta] = useState("");
  const [editando, setEditando] = useState(false);
  const navigate = useNavigate();
  //Contexto del usuario
  const { usuario } = useAuth();
  const { id } = useParams();
  useEffect(()=>{
    //Comprobamos si hay un gasto y lo establecemos en el Estado
    if(gasto){
      setEditando(true);
      //Comprobamos que el gasto sea del usuario conectado
      //Para ello validamos si el uid del login es igual al uidUsurio del gasto
      if(gasto.uidUsuario === usuario.uid){
        setCategoria(gasto.categoria);
        setInputDescripcion(gasto.descripcion);
        setInputCantidad(gasto.cantidad);
        setFecha(fromUnixTime(gasto.fecha));
      }else{
        navigate("/lista");
      }
    }


  },[gasto, usuario, navigate]);

  const handleChange = (e) => {
    if (e.target.name === "descripcion") {
      setInputDescripcion(e.target.value);
    } else if (e.target.name === "cantidad") {
      //Aqui se valida que solo se digiten numeros con el Replace es reemplazar las coincidencias de letras por vacio
      let cantidadInput = e.target.value.replace(/[^0-9.]/g, "");
      setInputCantidad(cantidadInput);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let cantidad = parseFloat(inputCantidad).toFixed(2);
    let fechaSegundos = getUnixTime(fecha);

    //Validación de que no se ingresen campos vacios
    if (inputDescripcion !== "" && inputCantidad !== "") {

      if(cantidad){
        try {
          if(!editando){
            await agregarGasto(
              inputDescripcion,
              Number(cantidad),
              Categoria,
              fechaSegundos,
              usuario.uid
            );
            cambiarAlerta({
              tipo: "exito",
              mensaje: "Gasto Agregado Correctamente"
            });
            
          }else if(editando){
            //Si editando es verdadero entonces es una actualización
            await actualizarGasto(id, inputDescripcion,cantidad, Categoria, fechaSegundos);
            cambiarAlerta({
              tipo: "exito",
              mensaje: "Gasto Actualizado Correctamente"
            });
           setTimeout(() => {
            navigate("/lista");
           }, 1500);
          }
          setInputDescripcion("");
          setInputCantidad(0);
          setCategoria("hogar");
          setFecha(new Date());
          cambiarEstadoAlerta(true);
        } catch (error) {
          console.log(error);
        }

      }else{
        cambiarEstadoAlerta(true);
        cambiarAlerta({
          tipo: "error",
          mensaje: "Ingrese una cantidad valida",
        });
        setTimeout(() => {
          cambiarEstadoAlerta(false);
       }, 1500);
      }

    }else{
      cambiarEstadoAlerta(true);
      cambiarAlerta({
        tipo: "error",
        mensaje: "Todos los campos son obligatorios",
      });
     setTimeout(() => {
        cambiarEstadoAlerta(false);
     }, 1500);
    };
  };

  return (
    <Formulario onSubmit={handleSubmit}>
      <ContenedorFiltros>
        <SelectCategoria categoria={Categoria} setCategoria={setCategoria} />
        <DatePeacker fecha={fecha} cambiarFecha={setFecha} />
      </ContenedorFiltros>

      <div>
        <Input
          type="text"
          name="descripcion"
          id="descripcion"
          placeholder="Descripcion"
          value={inputDescripcion}
          onChange={(e) => handleChange(e)}
        />

        <InputGrande
          type="text"
          name="cantidad"
          id="cantidad"
          placeholder="$0.000"
          value={inputCantidad}
          onChange={(e) => handleChange(e)}
        />
      </div>
      <ContenedorBoton>
        <Boton as="button" primario conIcono type="submit">
          {editando ? 'Actualizar Gasto': 'Agregar Gasto'} <IconoPlus />
        </Boton>
      </ContenedorBoton>
      <Alerta 
        tipo={alerta.tipo}
        mensaje={alerta.mensaje}
        estadoAlerta={estadoAlerta}
        cambiarEstadoAlerta={cambiarAlerta}
      />
    </Formulario>
  );
}

export default FormularioGasto;
