import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Barra = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1500;
  background: #000;
  color: #fff;
  text-align: center;
  font-size: 1rem;
  padding: 0.6rem 1rem;
  padding-bottom: calc(0.6rem + env(safe-area-inset-bottom));
`;

//Aviso discreto cuando el dispositivo pierde la conexión. Los cambios se guardan
//en el dispositivo y Firestore los sincroniza solo al reconectar.
const EstadoConexion = () => {
  const [enLinea, cambiarEnLinea] = useState(navigator.onLine);

  useEffect(() => {
    const alConectar = () => cambiarEnLinea(true);
    const alDesconectar = () => cambiarEnLinea(false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, []);

  if (enLinea) return null;

  return (
    <Barra role="status">
      Sin conexión: tus cambios se guardan en el dispositivo y se sincronizarán al reconectar.
    </Barra>
  );
};

export default EstadoConexion;
