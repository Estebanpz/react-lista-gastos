import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Header, ContenedorHeader, Titulo } from "./../elementos/Header";
import Boton from "./../elementos/Boton";
import { Formulario, Input, ContenedorBoton } from "./../elementos/ElementosDeFormulario";
import { ReactComponent as SvgLogin } from "./../img/registro.svg";
import styled from 'styled-components';

import { auth, createUserWithEmailAndPassword } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';

import Alerta from '../elementos/Alerta';

const Svg = styled(SvgLogin)`
    width: 100%;
    max-height: 8rem; /* 100px */
    margin-bottom: 1.25rem; /**25 px **/
`;

const RegistroUsuarios = () => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [estadoAlerta, cambiarEstadoAlerta] = useState(false);
    const [mensajeAlerta, cambiarMensajeAlerta] = useState({});

    const navigate = useNavigate();
    const handleChange = (e) => {
        switch (e.target.name) {
            case "email":
                setCorreo(e.target.value);
                break;
            case "password":
                setPassword(e.target.value);
                break;
            case "password2":
                setPassword2(e.target.value);
                break;
            default:
                break;
        }
    };

    const handleSubmit = async(e) => {
        e.preventDefault();
        cambiarEstadoAlerta(false);
        cambiarMensajeAlerta({});

        //Comprobación de un correo valido
        const expresionRegular = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
        if (!expresionRegular.test(correo)) {

            cambiarEstadoAlerta(true);
            cambiarMensajeAlerta({
                tipo: 'error',
                mensaje: 'Por favor ingreses un correo valido'
            });
            return;
        };

        if(correo === ''|| password === '' || password2 === ''){
            cambiarEstadoAlerta(true);
            cambiarMensajeAlerta({
                tipo: 'error',
                mensaje: 'Todos los campos son obligatorios'
            });
            return;
        };

        if(password !== password2){
            cambiarMensajeAlerta({
                tipo: 'error',
                mensaje: 'Las contraseñas no coinciden'
            });
            cambiarEstadoAlerta(true);
            return;
        };

        try {
            await createUserWithEmailAndPassword(auth, correo, password);
            cambiarEstadoAlerta(true);
            cambiarMensajeAlerta({
                tipo: 'exito',
                mensaje: 'Usuario creado correctamente'
            });
            cambiarEstadoAlerta(true);
            setCorreo('');
            setPassword('');
            setPassword2('');
            navigate('/');
        } catch (error) {

            let mensaje = "";
            cambiarEstadoAlerta(true);
           switch (error.code) {
               case "auth/weak-password":
                   mensaje = "La contraseña debe tener al menos 6 caracteres";
                     cambiarMensajeAlerta({
                        tipo: 'error',
                        mensaje: mensaje
                     });
                   break;
                case "auth/email-already-in-use":
                    mensaje = "El correo ya está en uso"
                    
                    break;
                case 'auth/invalid-email':
                    mensaje = 'El correo electrónico no es válido.';
                  
                    break;
               default:
                   mensaje = "Hubo un error al crear la cuenta";
                   cambiarEstadoAlerta(true);
                  
                   break;
           }

            cambiarMensajeAlerta({
                tipo: 'error',
                mensaje: mensaje
            });

           console.log(mensaje);
        }
    };

    return (
        <>
            <Helmet>
                <title>Crear Cuenta</title>
                <meta lang='es' />
            </Helmet>

            <Header>
                <ContenedorHeader>
                    <Titulo>Crear Cuenta</Titulo>
                    <div>
                        <Boton to="/inicio-sesion">Iniciar Sesion</Boton>
                    </div>
                </ContenedorHeader>
            </Header>

            <Formulario onSubmit={(e) => handleSubmit(e)}>
                <Svg />
                <Input
                    type="email"
                    name='email'
                    placeholder='Correo Electronico'
                    autoComplete='off'
                    value={correo}
                    onChange={(e) => handleChange(e)}
                />
                <Input
                    type="password"
                    name='password'
                    placeholder='Contraseña'
                    autoComplete='off'
                    value={password}
                    onChange={(e) => handleChange(e)}
                />
                <Input
                    type="password"
                    name='password2'
                    placeholder='Repetir Contraseña'
                    autoComplete='off'
                    value={password2}
                    onChange={(e) => handleChange(e)}
                />
                <ContenedorBoton>
                    <Boton as="button" primario type='submit'>
                        Crear Cuenta
                    </Boton>
                </ContenedorBoton>
            </Formulario>
            <Alerta  
                    tipo={mensajeAlerta.tipo} 
                    mensaje={mensajeAlerta.mensaje} 
                    estadoAlerta={estadoAlerta}
                    cambiarEstadoAlerta={cambiarEstadoAlerta}
            />
        </>
    );
}

export default RegistroUsuarios;