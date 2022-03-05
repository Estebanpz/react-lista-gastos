import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Header, ContenedorHeader, Titulo } from "./../elementos/Header";
import Boton from "./../elementos/Boton";
import { Formulario, Input, ContenedorBoton } from "./../elementos/ElementosDeFormulario";
import { ReactComponent as SvgLogin } from "./../img/login.svg";
import styled from 'styled-components';
import { auth, signInWithEmailAndPassword } from "./../firebase/firebaseConfig";
import Alerta from "./../elementos/Alerta";
import { useNavigate } from 'react-router-dom';


const Svg = styled(SvgLogin)`
    width: 100%;
    max-height: 12.5rem; /* 100px */
    margin-bottom: 1.25rem; /**25 px **/
`;

const InicioSesion = () => {
    //Estado de los INPUTS
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');

    //Estado de los ALERTAS y del MENSAJE
    const [estadoAlerta, setEstadoAlerta] = useState(false);
    const [mensajeAlerta, setMensajeAlerta] = useState({});

    let navigate = useNavigate();

    const handleChangeInputs = (e) => {
        switch (e.target.name) {
            case "email":
                setCorreo(e.target.value);
                break;
            case "password":
                setPassword(e.target.value);
                break;
            default:
                break;
        }
    };


    const onSubmit = async (e) => {
        e.preventDefault();
        setEstadoAlerta(false);
        setMensajeAlerta({});

        //Comprobación de un correo valido
        const expresionRegular = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
        if (!expresionRegular.test(correo)) {

            setEstadoAlerta(true);
            setMensajeAlerta({
                tipo: 'error',
                mensaje: 'Por favor ingreses un correo valido'
            });
            return;
        };

        if (correo === '' || password === '') {
            setEstadoAlerta(true);
            setMensajeAlerta({
                tipo: 'error',
                mensaje: 'Todos los campos son obligatorios'
            });
            return;
        };


        try {
            await signInWithEmailAndPassword(auth, correo, password);
            setEstadoAlerta(true);
            setMensajeAlerta({
                tipo: 'exito',
                mensaje: 'Usuario creado correctamente'
            });
            setCorreo('');
            setPassword('');
            navigate('/');
        } catch (error) {

            let mensaje = "";
            setEstadoAlerta(true);
            switch (error.code) {
                case "auth/weak-password":
                    mensaje = "La contraseña debe tener al menos 6 caracteres";
                    break;
                case "auth/email-already-in-use":
                    mensaje = "El correo ya está en uso"

                    break;
                case 'auth/invalid-email':
                    mensaje = 'El correo electrónico no es válido.';
                    break;

                case "auth/user-not-found":
                    mensaje = 'El usuario no existe';
                    break;
                case "auth/wrong-password":
                    mensaje = 'La contraseña es incorrecta';
                    break;
                case "auth/too-many-requests":
                    mensaje = 'Demasiados intentos fallidos de inicio de sesión. Inténtalo de nuevo en un rato.';
                    break;
                default:
                    mensaje = "Hubo un error al crear la cuenta";
                    setEstadoAlerta(true);
                    console.log(error);
                    break;
            };

            setMensajeAlerta({
                tipo: 'error',
                mensaje: mensaje
            });

        }
    };

    return (
        <>
            <Helmet>
                <title>Inicio Sesion</title>
                <meta lang='es' />
            </Helmet>

            <Header>
                <ContenedorHeader>
                    <Titulo>Inicio de Sesión</Titulo>
                    <div>
                        <Boton to="/crear-cuenta">Registrarse</Boton>
                    </div>
                </ContenedorHeader>
            </Header>

            <Formulario onSubmit={(e) => onSubmit(e)}>
                <Svg />
                <Input
                    type="email"
                    name='email'
                    placeholder='Correo Electronico'
                    autoComplete='off'
                    onChange={(e) => handleChangeInputs(e)}
                />
                <Input
                    type="password"
                    name='password'
                    placeholder='Contraseña'
                    autoComplete='off'
                    onChange={(e) => handleChangeInputs(e)}
                />
                <ContenedorBoton>
                    <Boton as="button" primario type='submit'>
                        Iniciar Sesion
                    </Boton>
                </ContenedorBoton>
            </Formulario>
            <Alerta
                tipo={mensajeAlerta.tipo}
                mensaje={mensajeAlerta.mensaje}
                estadoAlerta={estadoAlerta}
                cambiarEstadoAlerta={setEstadoAlerta}
            />
        </>
    );
}

export default InicioSesion;