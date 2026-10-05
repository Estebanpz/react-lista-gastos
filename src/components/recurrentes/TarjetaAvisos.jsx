import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Interruptor from "../auth/Interruptor";
import { BotonPrincipal, Espera } from "../auth/elementos";
import { BotonSecundario } from "./elementos";
import { estadoAvisos, activarAvisos, desactivarAvisos, guardarPreferencias } from "../../firebase/notificaciones";
import { db, auth, doc, getDoc } from "../../firebase/firebaseConfig";
import { OPCIONES_BASE } from "../../pwa/avisos";
import { DIAS_ANTES_AVISO } from "../../functions/recurrencias";

const CLAVE_DESCARTE = "avisos:descartado:v1";
const DESCARTE_MS = 14 * 24 * 60 * 60 * 1000;

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

const Acciones = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-top: 0.85rem;

  & > button:first-child {
    width: auto;
    padding: 0 1.25rem;
  }
`;

const Mensaje = styled.p`
  &&& {
    color: ${(p) => (p.$error ? "#B42323" : theme.verdeTexto)};
    font-weight: 600;
  }
`;

const Campana = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const descartadoReciente = () => {
  try {
    return Date.now() - Number(localStorage.getItem(CLAVE_DESCARTE) || 0) < DESCARTE_MS;
  } catch {
    return false;
  }
};

//Avisos de pagos en ESTE dispositivo. Explica qué llegará y cuándo ANTES del diálogo del navegador
//(pre-permiso) y solo pide permiso cuando la persona pulsa «Activar avisos».
const TarjetaAvisos = ({ siempre = false }) => {
  const [estado, cambiarEstado] = useState("cargando");
  const [ocupado, cambiarOcupado] = useState(false);
  const [mensaje, cambiarMensaje] = useState(null);
  const [detalle, cambiarDetalle] = useState(false);
  const [oculta, cambiarOculta] = useState(() => !siempre && descartadoReciente());

  const revisar = useCallback(() => estadoAvisos().then(cambiarEstado).catch(() => cambiarEstado("no-soportado")), []);
  useEffect(() => {
    revisar();
  }, [revisar]);

  //Preferencia guardada («Mostrar el nombre del pago en el aviso»)
  useEffect(() => {
    if (estado !== "activo" || !auth.currentUser) return;
    getDoc(doc(db, "usuarios", auth.currentUser.uid))
      .then((d) => cambiarDetalle(Boolean(d.exists() && d.data().detalleEnAviso)))
      .catch(() => {});
  }, [estado]);

  if (estado === "cargando" || estado === "no-soportado") return null;
  if (oculta && estado === "disponible") return null;

  const activar = async () => {
    cambiarOcupado(true);
    cambiarMensaje(null);
    try {
      const resultado = await activarAvisos({ detalleEnAviso: detalle });
      cambiarEstado(resultado);
      cambiarMensaje(resultado === "activo" ? { texto: "Listo: este dispositivo recibirá los avisos." } : null);
    } catch (error) {
      console.log(error);
      cambiarMensaje({ error: true, texto: "No pudimos activar los avisos. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      cambiarOcupado(false);
    }
  };

  const desactivar = async () => {
    cambiarOcupado(true);
    await desactivarAvisos();
    cambiarOcupado(false);
    cambiarMensaje({ texto: "Este dispositivo ya no recibirá avisos." });
    revisar();
  };

  //El navegador entrega el aviso al sistema operativo; si este lo silencia (modo «No molestar»,
  //notificaciones de Chrome apagadas en el sistema) no hay forma de detectarlo desde la página: se explica.
  const probar = async () => {
    cambiarMensaje(null);
    try {
      if (Notification.permission !== "granted") {
        cambiarEstado("denegado");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      await registro.showNotification("Aviso de prueba", {
        ...OPCIONES_BASE,
        tag: "prueba",
        body: "Así se verán tus recordatorios de pagos.",
        data: { url: "/recurrentes" },
      });
      cambiarMensaje({
        texto: "Aviso enviado. Si no lo ves, revisa que el sistema permita las notificaciones del navegador y que no esté en modo «No molestar».",
      });
    } catch (error) {
      console.log(error);
      cambiarMensaje({ error: true, texto: "El navegador no pudo mostrar el aviso de prueba." });
    }
  };

  const cambiarPreferencia = async (valor) => {
    cambiarDetalle(valor);
    try {
      await guardarPreferencias(auth.currentUser.uid, { detalleEnAviso: valor });
    } catch (error) {
      console.log(error);
    }
  };

  const ahoraNo = () => {
    try {
      localStorage.setItem(CLAVE_DESCARTE, String(Date.now()));
    } catch {
      /* sin almacenamiento: solo se oculta ahora */
    }
    cambiarOculta(true);
  };

  const textos = {
    disponible: { titulo: "Avisos en este dispositivo", cuerpo: `Te avisamos ${DIAS_ANTES_AVISO} días antes y el mismo día de cada pago, aunque la app esté cerrada.` },
    activo: { titulo: "Avisos activados", cuerpo: `Este dispositivo recibe los avisos ${DIAS_ANTES_AVISO} días antes y el mismo día de cada pago.` },
    denegado: { titulo: "Los avisos están bloqueados", cuerpo: "Actívalos en los ajustes del sitio (el candado junto a la dirección) y vuelve a esta pantalla." },
    "ios-sin-instalar": { titulo: "Instala la app para recibir avisos", cuerpo: "En iPhone los avisos solo llegan con la app instalada: toca Compartir y luego «Agregar a inicio»." },
  }[estado];

  return (
    <Tarjeta aria-labelledby="titulo-avisos" aria-busy={ocupado}>
      <Icono $activo={estado === "activo"}><Campana /></Icono>
      <div>
        <h2 id="titulo-avisos">{textos.titulo}</h2>
        <p>{textos.cuerpo}</p>

        {estado === "disponible" && (
          <Acciones>
            <BotonPrincipal type="button" onClick={activar} disabled={ocupado}>
              {ocupado ? <Espera aria-hidden="true" /> : null}
              Activar avisos
            </BotonPrincipal>
            {!siempre && <BotonSecundario type="button" onClick={ahoraNo}>Ahora no</BotonSecundario>}
          </Acciones>
        )}

        {estado === "activo" && (
          <>
            <div style={{ marginTop: "0.6rem" }}>
              <Interruptor id="aviso-detalle" etiqueta="Mostrar el nombre del pago en el aviso" marcado={detalle} alCambiar={cambiarPreferencia} />
            </div>
            <Acciones>
              <BotonSecundario type="button" onClick={probar} disabled={ocupado}>Enviar aviso de prueba</BotonSecundario>
              <BotonSecundario type="button" onClick={desactivar} disabled={ocupado}>Desactivar aquí</BotonSecundario>
            </Acciones>
          </>
        )}

        {mensaje && <Mensaje role="status" $error={mensaje.error}>{mensaje.texto}</Mensaje>}
      </div>
    </Tarjeta>
  );
};

export default TarjetaAvisos;
