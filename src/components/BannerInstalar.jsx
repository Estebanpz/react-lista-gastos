import React, { useEffect, useState } from "react";
import styled from "styled-components";
import theme from "../theme";
import { suscribirInstalacion, instalar, estaInstalada, esIOS } from "../pwa/instalacion";
import GuiaInstalarIOS from "./instalar/GuiaInstalarIOS";

const CLAVE_DESCARTE = "pwa:instalar:v1";
const TREINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

//localStorage puede fallar (modo privado, datos bloqueados): siempre dentro de try/catch
const fueDescartadoRecientemente = () => {
  try {
    const guardado = Number(window.localStorage.getItem(CLAVE_DESCARTE));
    return guardado > 0 && Date.now() - guardado < TREINTA_DIAS_MS;
  } catch (error) {
    return false;
  }
};

const recordarDescarte = () => {
  try {
    window.localStorage.setItem(CLAVE_DESCARTE, String(Date.now()));
  } catch (error) {
    //sin almacenamiento: el aviso volverá a salir en la próxima visita
  }
};

const Banner = styled.section`
  margin: 0 1.25rem 1rem;
  padding: 1rem 1.25rem;
  background: ${theme.grisClaro};
  border-radius: 0.625rem; /* 10px */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 1rem;
`;

const Acciones = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const Accion = styled.button`
  border: none;
  border-radius: 0.375rem;
  padding: 0.6rem 0.9rem;
  font-family: "Work Sans", sans-serif;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  color: ${(props) => (props.primaria ? "#fff" : "#000")};
  background: ${(props) => (props.primaria ? theme.colorPrimario : "transparent")};

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

//Invita a instalar la app: botón «Instalar app» en Chrome/Edge/Android e instrucciones en iOS.
//No aparece si ya está instalada ni si la persona dijo «Ahora no» en los últimos 30 días.
const BannerInstalar = () => {
  const [puedeInstalar, cambiarPuedeInstalar] = useState(false);
  const [descartado, cambiarDescartado] = useState(fueDescartadoRecientemente);
  const [instalada, cambiarInstalada] = useState(estaInstalada);
  const [guia, cambiarGuia] = useState(false);

  useEffect(
    () =>
      suscribirInstalacion((estado) => {
        cambiarPuedeInstalar(estado.puedeInstalar);
        if (estado.instalada) cambiarInstalada(true);
      }),
    []
  );

  const mostrarInstruccionesIOS = esIOS();
  if (instalada || descartado || !(puedeInstalar || mostrarInstruccionesIOS)) return null;

  const descartar = () => {
    recordarDescarte();
    cambiarDescartado(true);
  };

  return (
    <Banner aria-label="Instalar la aplicación">
      <span>
        {puedeInstalar
          ? "Instala la app para abrirla desde tu pantalla de inicio, incluso sin conexión."
          : "Instala la app en tu pantalla de inicio para abrirla rápido y recibir los avisos de tus pagos."}
      </span>
      <Acciones>
        <Accion type="button" onClick={descartar}>
          Ahora no
        </Accion>
        {puedeInstalar ? (
          <Accion type="button" primaria onClick={() => instalar()}>
            Instalar app
          </Accion>
        ) : (
          <Accion type="button" primaria onClick={() => cambiarGuia(true)}>
            Ver cómo instalar
          </Accion>
        )}
      </Acciones>
      {guia && <GuiaInstalarIOS abierta alCerrar={() => cambiarGuia(false)} />}
    </Banner>
  );
};

export default BannerInstalar;
