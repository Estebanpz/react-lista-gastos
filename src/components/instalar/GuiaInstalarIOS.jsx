import React from "react";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import Hoja from "../Hoja";
import { detectarNavegadorIOS, puedeInstalarEnEsteIOS } from "../../pwa/instalacion";
import { IconoCompartir, IconoAgregarInicio, IconoInterruptor, IconoPuntos } from "../iconos";

const entrar = keyframes`from { opacity: 0; transform: translateY(0.5rem); } to { opacity: 1; transform: none; }`;

const Lista = styled.ol`
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
`;

const Paso = styled.li`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.9rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid ${theme.borde};
  border-radius: 1.1rem;
  background: #fff;
  animation: ${entrar} 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: ${(p) => p.$i * 90}ms;

  .icono {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.9rem;
    background: ${theme.violetaSuave};
    color: #3e4bc7;
  }

  strong {
    display: block;
    color: ${theme.tinta};
    font-size: 1rem;
  }

  span {
    color: ${theme.tintaSuave};
    font-size: 0.9375rem;
    line-height: 1.4;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Aviso = styled.p`
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: ${(p) => (p.$tono === "ambar" ? "#FEF0C7" : theme.verdeSuave)};
  color: ${(p) => (p.$tono === "ambar" ? "#7A2E0E" : theme.verdeTexto)};
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.45;
`;

const NOMBRE_NAVEGADOR = { chrome: "Chrome", firefox: "Firefox", edge: "Edge" };

//Hoja con los pasos para instalar la app en iPhone/iPad (no hay diálogo nativo en iOS). Los pasos cambian según el
//navegador: Safari, Chrome/Firefox/Edge (iOS 16.4 o más) o un navegador que no permite instalar (se manda a Safari).
const GuiaInstalarIOS = ({ abierta, alCerrar, info }) => {
  const datos = info || detectarNavegadorIOS();
  const { navegador } = datos;
  const posible = puedeInstalarEnEsteIOS(datos);
  const esSafari = navegador === "safari";

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Instalar en tu iPhone" subtitulo="Se hace en 3 toques desde el menú Compartir.">
      {!posible ? (
        <>
          <Aviso $tono="ambar" role="status">
            {navegador === "integrado"
              ? "Estás dentro de otra app (por ejemplo Instagram o Facebook), y ahí no se puede instalar."
              : "Este navegador no permite instalar apps en tu versión de iOS."}{" "}
            Abre esta misma página en <strong>Safari</strong> y vuelve a pulsar «Ver cómo instalar».
          </Aviso>
          <Lista aria-label="Cómo abrirla en Safari">
            <Paso $i={0}>
              <div className="icono" aria-hidden="true"><IconoCompartir tam={26} /></div>
              <div>
                <strong>Copia la dirección</strong>
                <span>Toca Compartir y elige «Copiar», o la opción «Abrir en Safari» si aparece.</span>
              </div>
            </Paso>
          </Lista>
        </>
      ) : (
        <>
          <Lista aria-label="Pasos para instalar">
            <Paso $i={0}>
              <div className="icono" aria-hidden="true">{esSafari ? <IconoPuntos tam={26} /> : <IconoCompartir tam={26} />}</div>
              <div>
                <strong>1. Abre el menú Compartir</strong>
                <span>
                  {esSafari
                    ? "En Safari toca «⋯» junto a la dirección (o el icono Compartir de la barra inferior) y luego «Compartir»."
                    : `En ${NOMBRE_NAVEGADOR[navegador] || "tu navegador"} toca el icono Compartir (un cuadro con una flecha hacia arriba) en la barra o en su menú.`}
                </span>
              </div>
            </Paso>
            <Paso $i={1}>
              <div className="icono" aria-hidden="true"><IconoAgregarInicio tam={26} /></div>
              <div>
                <strong>2. Toca «Agregar a pantalla de inicio»</strong>
                <span>Desliza hacia abajo en la lista si no la ves. En algunos iPhone dice «Añadir a pantalla de inicio».</span>
              </div>
            </Paso>
            <Paso $i={2}>
              <div className="icono" aria-hidden="true"><IconoInterruptor tam={26} /></div>
              <div>
                <strong>3. Deja activado «Abrir como app web» y toca «Agregar»</strong>
                <span>Es lo que hace que se abra como app y permite recibir los avisos de tus pagos.</span>
              </div>
            </Paso>
          </Lista>
          {!esSafari && <Aviso $tono="ambar">Si no ves «Agregar a pantalla de inicio» en {NOMBRE_NAVEGADOR[navegador] || "este navegador"}, abre la página en Safari y repite los pasos.</Aviso>}
          <Aviso>Después abre «Finanzas» desde el icono nuevo en tu pantalla de inicio, no desde el navegador.</Aviso>
        </>
      )}
    </Hoja>
  );
};

export default GuiaInstalarIOS;
