import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Interruptor from "../auth/Interruptor";
import { BotonPrincipal, Espera } from "../auth/elementos";
import { Etiqueta, Entrada, Ayuda } from "./elementos";
import { db, auth, doc, getDoc } from "../../firebase/firebaseConfig";
import { guardarSms } from "../../firebase/sms";
import { normalizarCelular } from "../../functions/sms";

let contador = 0;

const Tarjeta = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.9rem;
  padding: 1.1rem 1.15rem;
  border: 1px solid ${theme.borde};
  border-radius: 1.5rem;
  background: #fff;

  h2 {
    text-wrap: balance;
    font-size: 1.05rem;
    font-weight: 800;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.3rem;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: ${theme.tintaSuave};
  }
`;

const Icono = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.85rem;
  background: ${(p) => (p.$activo ? theme.verdeSuave : theme.violetaSuave)};
  color: ${(p) => (p.$activo ? theme.verdeTexto : "#3e4bc7")};
`;

const Mensaje = styled.p`
  &&& {
    color: ${(p) => (p.$error ? "#B42323" : theme.verdeTexto)};
    font-weight: 600;
  }
`;

const Burbuja = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </svg>
);

const ERROR_CELULAR = "Escribe tu celular de 10 dígitos (empieza por 3).";

//SMS el día de cada pago a las 8:30 a. m. (hora de Colombia). La persona escribe su celular y lo enciende (nace apagado).
//Lo envía el Worker (worker-recordatorios) con LabsMobile; el celular se guarda en usuarios/{uid}.
const TarjetaSms = () => {
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `sms-${++contador}`;
  const id = idBase.current;
  const [cargando, cambiarCargando] = useState(true);
  const [celular, cambiarCelular] = useState("");
  const [activo, cambiarActivo] = useState(false);
  const [detalleEnAviso, cambiarDetalleEnAviso] = useState(false);
  const [ocupado, cambiarOcupado] = useState(false);
  const [mensaje, cambiarMensaje] = useState(null);

  useEffect(() => {
    let vigente = true;
    if (!auth.currentUser) {
      cambiarCargando(false);
      return undefined;
    }
    getDoc(doc(db, "usuarios", auth.currentUser.uid))
      .then((d) => {
        if (!vigente || !d.exists()) return;
        const datos = d.data();
        if (typeof datos.celular === "string") cambiarCelular(datos.celular.replace(/^\+57/, ""));
        cambiarActivo(datos.smsActivo === true);
        cambiarDetalleEnAviso(datos.detalleEnAviso === true);
      })
      .catch((e) => console.log(e))
      .finally(() => {
        if (vigente) cambiarCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (cargando) return null;

  const guardar = async (e) => {
    e.preventDefault();
    cambiarMensaje(null);
    const normalizado = normalizarCelular(celular);
    if ((activo || celular.trim()) && !normalizado) return cambiarMensaje({ error: true, texto: ERROR_CELULAR });
    cambiarOcupado(true);
    try {
      await guardarSms(auth.currentUser.uid, { celular: normalizado, smsActivo: activo, detalleEnAviso });
      cambiarMensaje({ texto: activo ? "Listo: te enviaremos el SMS el día de cada pago." : "Guardado. No te enviaremos SMS." });
    } catch (error) {
      console.log(error);
      cambiarMensaje({ error: true, texto: "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      cambiarOcupado(false);
    }
  };

  return (
    <Tarjeta aria-labelledby={`${id}-titulo`} aria-busy={ocupado}>
      <Icono $activo={activo}>
        <Burbuja />
      </Icono>
      <form onSubmit={guardar} noValidate>
        <h2 id={`${id}-titulo`}>Recordatorio por SMS</h2>
        <p>El día de cada pago te enviamos un SMS a las 8:30 a. m. (hora de Colombia). Si lo registras antes, no te llega.</p>
        <div style={{ marginTop: "0.85rem" }}>
          <Etiqueta htmlFor={`${id}-celular`}>Celular</Etiqueta>
          <Entrada
            id={`${id}-celular`}
            name="celular"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="300 123 4567"
            maxLength={14}
            value={celular}
            onChange={(e) => {
              cambiarCelular(e.target.value.replace(/[^\d ]/g, ""));
              cambiarMensaje(null);
            }}
          />
          <Ayuda>Solo celulares de Colombia. Lo usamos únicamente para tus recordatorios.</Ayuda>
        </div>
        <div style={{ marginTop: "0.6rem" }}>
          <Interruptor
            id={`${id}-activo`}
            etiqueta="Recordarme por SMS"
            marcado={activo}
            alCambiar={(valor) => {
              cambiarActivo(valor);
              cambiarMensaje(null);
            }}
          />
        </div>
        <div style={{ marginTop: "0.85rem" }}>
          <BotonPrincipal type="submit" disabled={ocupado} style={{ width: "auto", padding: "0 1.25rem" }}>
            {ocupado ? <Espera aria-hidden="true" /> : null}
            Guardar
          </BotonPrincipal>
        </div>
        {mensaje && (
          <Mensaje role={mensaje.error ? "alert" : "status"} $error={mensaje.error}>
            {mensaje.texto}
          </Mensaje>
        )}
      </form>
    </Tarjeta>
  );
};

export default TarjetaSms;
