import React, { useEffect, useState } from "react";
import { suscribirInstalacion, instalar, estaInstalada, esIOS } from "../../pwa/instalacion";
import { BotonSecundario } from "../recurrentes/elementos";
import { IconoInstalar } from "../iconos";
import GuiaInstalarIOS from "./GuiaInstalarIOS";

//Botón «Instalar la app» siempre disponible (no depende del aviso que se pudo descartar). En Chrome/Edge/Android abre el
//diálogo nativo; en iPhone/iPad abre la guía paso a paso. No se muestra si ya está instalada o si no hay forma de instalar.
const BotonInstalarApp = () => {
  const [puedeInstalar, cambiarPuedeInstalar] = useState(false);
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

  const ios = esIOS();
  if (instalada || !(puedeInstalar || ios)) return null;

  return (
    <>
      <BotonSecundario type="button" onClick={() => (puedeInstalar ? instalar() : cambiarGuia(true))}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <IconoInstalar tam={18} />
          {ios && !puedeInstalar ? "Cómo instalar la app" : "Instalar la app"}
        </span>
      </BotonSecundario>
      {guia && <GuiaInstalarIOS abierta alCerrar={() => cambiarGuia(false)} />}
    </>
  );
};

export default BotonInstalarApp;
