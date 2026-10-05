import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { destinoTrasLogin } from "../../functions/destino";
import CampoTexto from "./CampoTexto";
import Interruptor from "./Interruptor";
import { IconoCorreo, IconoCandado, IconoOjo, IconoOjoTachado, IconoFlecha, IconoRegresar } from "./iconos";
import { Formulario, Fila, BotonPrincipal, BotonEnlace, BotonOjo, Espera, MensajeError, MensajeExito, Texto, Oculto } from "./elementos";
import { iniciarSesion, recuperarClave } from "../../firebase/autenticacion";
import { mensajeInicioSesion, mensajeRecuperar } from "../../functions/mensajesAuth";
import { errorCorreo } from "./validaciones";

//Panel «Iniciar sesión». Tiene tres vistas dentro del mismo panel:
//  entrar → correo + contraseña · recuperar → pedir el enlace · recuperado → confirmación
const FormularioInicioSesion = ({ alError }) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [vista, cambiarVista] = useState("entrar");
  const [correo, cambiarCorreo] = useState("");
  const [clave, cambiarClave] = useState("");
  const [verClave, cambiarVerClave] = useState(false);
  const [recordar, cambiarRecordar] = useState(true);
  const [errores, cambiarErrores] = useState({});
  const [enviando, cambiarEnviando] = useState(false);
  const refCorreo = useRef(null);
  const refClave = useRef(null);

  const fallar = (nuevos) => {
    cambiarErrores(nuevos);
    alError();
    //Se enfoca el primer campo con error
    if (nuevos.correo && refCorreo.current) refCorreo.current.focus();
    else if (nuevos.clave && refClave.current) refClave.current.focus();
  };

  const entrar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const nuevos = {};
    const errCorreo = errorCorreo(correo);
    if (errCorreo) nuevos.correo = errCorreo;
    if (!clave) nuevos.clave = "Escribe tu contraseña.";
    if (Object.keys(nuevos).length) return fallar(nuevos);

    cambiarErrores({});
    cambiarEnviando(true);
    try {
      await iniciarSesion(correo.trim(), clave, recordar);
      navigate(destinoTrasLogin(state), { replace: true });
    } catch (error) {
      cambiarEnviando(false);
      fallar({ general: mensajeInicioSesion(error) });
    }
  };

  const pedirEnlace = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const errCorreo = errorCorreo(correo);
    if (errCorreo) return fallar({ correo: errCorreo });

    cambiarErrores({});
    cambiarEnviando(true);
    try {
      await recuperarClave(correo.trim());
      cambiarEnviando(false);
      cambiarVista("recuperado");
    } catch (error) {
      cambiarEnviando(false);
      //Si el proyecto no tiene la protección contra enumeración de correos, Firebase avisa de
      //que la cuenta no existe. Se responde igual que en el caso normal para no revelar qué correos tienen cuenta.
      if (error && error.code === "auth/user-not-found") {
        cambiarVista("recuperado");
        return;
      }
      fallar({ general: mensajeRecuperar(error) });
    }
  };

  const volver = () => {
    cambiarErrores({});
    cambiarVista("entrar");
  };

  if (vista === "recuperado") {
    return (
      <Formulario as="div">
        <Oculto as="h2">Revisa tu correo</Oculto>
        <MensajeExito role="status">
          Si ese correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.
        </MensajeExito>
        <BotonEnlace type="button" onClick={volver}>
          <IconoRegresar tam={16} aria-hidden="true" /> Volver a iniciar sesión
        </BotonEnlace>
      </Formulario>
    );
  }

  if (vista === "recuperar") {
    return (
      <Formulario onSubmit={pedirEnlace} noValidate aria-busy={enviando}>
        <Oculto as="h2">Recupera tu contraseña</Oculto>
        <Texto>Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.</Texto>
        <CampoTexto
          id="recuperar-correo"
          ref={refCorreo}
          etiqueta="Correo electrónico"
          icono={<IconoCorreo />}
          type="email"
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="tucorreo@ejemplo.com"
          value={correo}
          onChange={(e) => cambiarCorreo(e.target.value)}
          error={errores.correo}
        />
        {errores.general && <MensajeError role="alert">{errores.general}</MensajeError>}
        <BotonPrincipal type="submit" aria-busy={enviando}>
          {enviando ? <><Espera aria-hidden="true" /> Enviando…</> : "Enviar enlace"}
        </BotonPrincipal>
        <BotonEnlace type="button" onClick={volver}>
          <IconoRegresar tam={16} aria-hidden="true" /> Volver a iniciar sesión
        </BotonEnlace>
      </Formulario>
    );
  }

  return (
    <Formulario onSubmit={entrar} noValidate aria-busy={enviando}>
      <Oculto as="h2">Inicia sesión</Oculto>
      <CampoTexto
        id="entrar-correo"
        ref={refCorreo}
        etiqueta="Correo electrónico"
        icono={<IconoCorreo />}
        type="email"
        name="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="tucorreo@ejemplo.com"
        value={correo}
        onChange={(e) => cambiarCorreo(e.target.value)}
        error={errores.correo}
      />
      <CampoTexto
        id="entrar-clave"
        ref={refClave}
        etiqueta="Contraseña"
        icono={<IconoCandado />}
        type={verClave ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        placeholder="Tu contraseña…"
        value={clave}
        onChange={(e) => cambiarClave(e.target.value)}
        error={errores.clave}
        derecha={
          <BotonOjo
            type="button"
            aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={verClave}
            onClick={() => cambiarVerClave(!verClave)}
          >
            {verClave ? <IconoOjoTachado /> : <IconoOjo />}
          </BotonOjo>
        }
      />
      <Fila>
        <Interruptor id="entrar-recordar" etiqueta="Recordarme" marcado={recordar} alCambiar={cambiarRecordar} />
        <BotonEnlace type="button" onClick={() => cambiarVista("recuperar")}>
          ¿Olvidaste tu contraseña?
        </BotonEnlace>
      </Fila>
      {errores.general && <MensajeError role="alert">{errores.general}</MensajeError>}
      <BotonPrincipal type="submit" aria-busy={enviando}>
        {enviando ? <><Espera aria-hidden="true" /> Iniciando…</> : <>Iniciar sesión <IconoFlecha tam={20} /></>}
      </BotonPrincipal>
    </Formulario>
  );
};

export default FormularioInicioSesion;
