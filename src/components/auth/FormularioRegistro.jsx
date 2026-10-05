import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CampoTexto from "./CampoTexto";
import { IconoCorreo, IconoCandado, IconoOjo, IconoOjoTachado, IconoFlecha } from "./iconos";
import { Formulario, BotonPrincipal, BotonOjo, Espera, MensajeError, Oculto } from "./elementos";
import { registrarUsuario } from "../../firebase/autenticacion";
import { mensajeRegistro } from "../../functions/mensajesAuth";
import { errorCorreo, MIN_CLAVE } from "./validaciones";

//Panel «Crear cuenta»
const FormularioRegistro = ({ alError }) => {
  const navigate = useNavigate();
  const [correo, cambiarCorreo] = useState("");
  const [clave, cambiarClave] = useState("");
  const [repetir, cambiarRepetir] = useState("");
  const [verClave, cambiarVerClave] = useState(false);
  const [errores, cambiarErrores] = useState({});
  const [enviando, cambiarEnviando] = useState(false);
  const refCorreo = useRef(null);
  const refClave = useRef(null);
  const refRepetir = useRef(null);

  const fallar = (nuevos) => {
    cambiarErrores(nuevos);
    alError();
    if (nuevos.correo && refCorreo.current) refCorreo.current.focus();
    else if (nuevos.clave && refClave.current) refClave.current.focus();
    else if (nuevos.repetir && refRepetir.current) refRepetir.current.focus();
  };

  const crear = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const nuevos = {};
    const errCorreo = errorCorreo(correo);
    if (errCorreo) nuevos.correo = errCorreo;
    if (clave.length < MIN_CLAVE) nuevos.clave = `Usa al menos ${MIN_CLAVE} caracteres.`;
    if (!repetir) nuevos.repetir = "Repite la contraseña para confirmarla.";
    else if (repetir !== clave) nuevos.repetir = "Las contraseñas no coinciden.";
    if (Object.keys(nuevos).length) return fallar(nuevos);

    cambiarErrores({});
    cambiarEnviando(true);
    try {
      await registrarUsuario(correo.trim(), clave, true);
      navigate("/");
    } catch (error) {
      cambiarEnviando(false);
      fallar({ general: mensajeRegistro(error) });
    }
  };

  const ojo = (
    <BotonOjo
      type="button"
      aria-label={verClave ? "Ocultar contraseñas" : "Mostrar contraseñas"}
      aria-pressed={verClave}
      onClick={() => cambiarVerClave(!verClave)}
    >
      {verClave ? <IconoOjoTachado /> : <IconoOjo />}
    </BotonOjo>
  );

  return (
    <Formulario onSubmit={crear} noValidate aria-busy={enviando}>
      <Oculto as="h2">Crea tu cuenta</Oculto>
      <CampoTexto
        id="crear-correo"
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
        id="crear-clave"
        ref={refClave}
        etiqueta="Contraseña"
        icono={<IconoCandado />}
        type={verClave ? "text" : "password"}
        name="new-password"
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        value={clave}
        onChange={(e) => cambiarClave(e.target.value)}
        error={errores.clave}
        derecha={ojo}
      />
      <CampoTexto
        id="crear-repetir"
        ref={refRepetir}
        etiqueta="Repetir contraseña"
        icono={<IconoCandado />}
        type={verClave ? "text" : "password"}
        name="confirm-password"
        autoComplete="new-password"
        placeholder="Escríbela otra vez…"
        value={repetir}
        onChange={(e) => cambiarRepetir(e.target.value)}
        error={errores.repetir}
      />
      {errores.general && <MensajeError role="alert">{errores.general}</MensajeError>}
      <BotonPrincipal type="submit" aria-busy={enviando}>
        {enviando ? <><Espera aria-hidden="true" /> Creando…</> : <>Crear cuenta <IconoFlecha tam={20} /></>}
      </BotonPrincipal>
    </Formulario>
  );
};

export default FormularioRegistro;
