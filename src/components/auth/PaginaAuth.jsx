import React, { useCallback, useState } from "react";
import { Helmet } from "react-helmet";
import { Navigate, useLocation } from "react-router-dom";
import { destinoTrasLogin } from "../../functions/destino";
import styled, { keyframes } from "styled-components";
import { useDrag } from "@use-gesture/react";
import theme from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { ReactComponent as Ilustracion } from "../../img/undraw_mobile_payments.svg";
import logoMarca from "../../img/logo-marca.png";
import FormularioInicioSesion from "./FormularioInicioSesion";
import { IconoSinConexion, IconoCampana, IconoRayo } from "./iconos";

// ---------- Animaciones ----------
//Un solo momento «de autor»: la hoja sube al entrar. El resto son transiciones funcionales.
const subir = keyframes`
  from { opacity: 0; transform: translateY(2.25rem); }
  to { opacity: 1; transform: none; }
`;

const aparecer = keyframes`
  from { opacity: 0; transform: translateY(1rem); }
  to { opacity: 1; transform: none; }
`;

const sacudir = keyframes`
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60% { transform: translateX(7px); }
`;

const SALIDA_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

// ---------- Estructura ----------
const Pagina = styled.main`
  position: relative;
  z-index: 100;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${theme.fondo};
  color: ${theme.tinta};
  font-family: "Work Sans", sans-serif;

  & ::selection {
    background: rgba(91, 105, 226, 0.22);
  }

  @media (min-width: 60rem) {
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
`;

//En móvil no añade caja (los hijos se apilan); en escritorio es la tarjeta de dos columnas
const Tarjeta = styled.div`
  display: contents;

  @media (min-width: 60rem) {
    display: grid;
    /* minmax(0, …) evita que el carrusel (200 % de ancho) estire las columnas */
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    width: 100%;
    max-width: 64rem;
    min-height: 36rem;
    background: #fff;
    border-radius: 1.75rem;
    box-shadow: 0 24px 60px rgba(20, 22, 31, 0.1);
    overflow: hidden;
    animation: ${aparecer} 0.6s ${SALIDA_EXPO} both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
`;

const Marca = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 1.125rem;
  font-weight: 700;
  white-space: nowrap;
  color: ${theme.verdeTexto};

  img {
    display: block;
    width: 2.5rem;
    height: 2.5rem;
  }
`;

const Titular = styled.h1`
  font-size: clamp(1.6rem, 6.4vw, 2rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.02em;
  text-wrap: balance;
  color: ${theme.tinta};

  em {
    font-style: normal;
    color: ${theme.verdeTexto};
  }

  @media (min-width: 60rem) {
    font-size: 2.5rem;
  }
`;

const Linea = styled.p`
  margin-top: 0.5rem;
  font-size: 1rem;
  line-height: 1.45;
  color: ${theme.tintaSuave};
`;

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1.1rem;
  list-style: none;
`;

const Chip = styled.li`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid ${theme.borde};
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  white-space: nowrap;
  font-weight: 500;
  color: ${theme.tinta};

  svg {
    color: ${theme.verdeTexto};
  }
`;

// ---------- Cabecera de marca (móvil) ----------
const Hero = styled.header`
  position: relative;
  padding: max(1.25rem, env(safe-area-inset-top)) 1.25rem 3rem;
  background:
    radial-gradient(60% 70% at 8% 0%, ${theme.violetaSuave}, transparent 70%),
    radial-gradient(55% 60% at 100% 55%, ${theme.verdeSuave}, transparent 70%),
    ${theme.fondo};

  @media (min-width: 60rem) {
    display: none;
  }
`;

//La parte desplegable de la cabecera: se contrae cuando se abre el teclado o se sube la hoja
const HeroDetalle = styled.div`
  display: grid;
  grid-template-rows: ${(p) => (p.$compacto ? "0fr" : "1fr")};
  opacity: ${(p) => (p.$compacto ? 0 : 1)};
  transition: grid-template-rows 0.5s ${SALIDA_EXPO}, opacity 0.3s ease;

  & > div {
    min-height: 0;
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const HeroCuerpo = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.5rem;

  svg {
    flex-shrink: 0;
    width: 8.5rem;
    height: 8.5rem;
  }
`;

// ---------- Panel lateral (escritorio) ----------
const Lateral = styled.aside`
  display: none;

  min-width: 0;

  @media (min-width: 60rem) {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2.5rem;
    background:
      radial-gradient(70% 55% at 0% 0%, ${theme.violetaSuave}, transparent 75%),
      radial-gradient(70% 60% at 100% 100%, ${theme.verdeSuave}, transparent 75%),
      ${theme.campo};
    border-right: 1px solid ${theme.borde};
  }

  svg {
    width: 100%;
    max-width: 17rem;
    height: auto;
    margin: auto;
  }
`;

// ---------- Hoja con el formulario ----------
const Hoja = styled.section`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: -1.75rem;
  padding: 0.5rem 1.25rem max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem));
  background: #fff;
  border-radius: 1.75rem 1.75rem 0 0;
  box-shadow: 0 -12px 32px rgba(20, 22, 31, 0.08);
  animation: ${subir} 0.7s ${SALIDA_EXPO} both;

  min-width: 0;

  @media (min-width: 60rem) {
    margin: 0;
    padding: 2.5rem 3rem;
    justify-content: center;
    border-radius: 0;
    box-shadow: none;
    animation: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

//Asa de la hoja: se toca o se arrastra para mostrar u ocultar la cabecera
const Asa = styled.button`
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 1.75rem;
  margin-bottom: -0.25rem;
  border: 0;
  background: none;
  cursor: grab;
  touch-action: none;

  &::before {
    content: "";
    width: 2.75rem;
    height: 0.3rem;
    border-radius: 999px;
    background: #cfd5dd;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 0;
    border-radius: 0.5rem;
  }

  @media (min-width: 60rem) {
    display: none;
  }
`;

//El acceso es por invitación: solo hay formulario de inicio de sesión (las cuentas se crean en Firebase)
const Encabezado = styled.div`
  h2 {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    text-wrap: balance;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.3rem;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: ${theme.tintaSuave};
  }
`;

const Panel = styled.div`
  animation: ${(p) => (p.$sacudir ? sacudir : "none")} 0.4s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const PieOffline = styled.p`
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding: 0.5rem 0.9rem;
  border: 1px solid ${theme.borde};
  border-radius: 999px;
  background: ${theme.campo};
  font-size: 0.8125rem;
  color: ${theme.tintaSuave};

  svg {
    color: ${theme.verdeTexto};
    flex-shrink: 0;
  }
`;

// ---------- Lógica ----------
const vibrar = () => {
  try {
    if (navigator.vibrate) navigator.vibrate(40);
  } catch (error) {
    //no todos los dispositivos permiten vibrar
  }
};

const PaginaAuth = () => {
  const { usuario } = useAuth();
  const { state } = useLocation();

  const [sacudiendo, cambiarSacudiendo] = useState(false);
  const [compactoManual, cambiarCompactoManual] = useState(false);
  const [enfocado, cambiarEnfocado] = useState(false);
  const compacto = compactoManual || enfocado;

  //Error de validación o de acceso: sacudida del panel + vibración corta (Android)
  const avisarError = useCallback(() => {
    cambiarSacudiendo(true);
    vibrar();
    window.setTimeout(() => cambiarSacudiendo(false), 450);
  }, []);

  //Arrastrar el asa hacia arriba oculta la cabecera; hacia abajo la muestra
  const gestosAsa = useDrag(
    ({ last, movement: [, my], tap }) => {
      if (tap || !last) return;
      if (my < -28) cambiarCompactoManual(true);
      if (my > 28) cambiarCompactoManual(false);
    },
    { axis: "y", filterTaps: true, threshold: 6, pointer: { touch: true } }
  );

  //Cuando hay un campo enfocado (teclado abierto en el móvil) se libera espacio
  const alEnfocar = () => cambiarEnfocado(true);
  const alDesenfocar = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) cambiarEnfocado(false);
  };

  if (usuario) return <Navigate to={destinoTrasLogin(state)} replace />;


  return (
    <Pagina>
      <Helmet>
        <title>Iniciar sesión · Finanzas</title>
      </Helmet>

      <Tarjeta>
        {/* Cabecera de marca: solo en móvil */}
        <Hero>
          <Marca>
            <img src={logoMarca} width="40" height="40" alt="" />
            <span>Finanzas</span>
          </Marca>
          <HeroDetalle $compacto={compacto}>
            <div>
            <HeroCuerpo>
              <div>
                <Titular>
                  Tus gastos, <em>claros</em> y al día
                </Titular>
                <Linea>Control personal y de tu negocio.</Linea>
              </div>
              <Ilustracion aria-hidden="true" focusable="false" />
            </HeroCuerpo>
            <Chips aria-label="Ventajas de la app">
              <Chip>
                <IconoSinConexion tam={14} /> Sin conexión
              </Chip>
              <Chip>
                <IconoCampana tam={14} /> Recordatorios
              </Chip>
              <Chip>
                <IconoRayo tam={14} /> Registro rápido
              </Chip>
            </Chips>
            </div>
          </HeroDetalle>
        </Hero>

        {/* Panel de marca: solo en escritorio */}
        <Lateral>
          <Marca>
            <img src={logoMarca} width="40" height="40" alt="" />
            <span>Finanzas</span>
          </Marca>
          <div>
            <Titular>
              Tus gastos, <em>claros</em> y al día
            </Titular>
            <Linea>Registra tus gastos en segundos, incluso sin conexión.</Linea>
          </div>
          <Ilustracion aria-hidden="true" focusable="false" />
        </Lateral>

        <Hoja onFocus={alEnfocar} onBlur={alDesenfocar}>
          <Asa
            type="button"
            {...gestosAsa()}
            aria-label={compacto ? "Mostrar la cabecera" : "Ocultar la cabecera"}
            aria-expanded={!compacto}
            onClick={() => cambiarCompactoManual(!compactoManual)}
          />

          <Encabezado>
            <h2>Iniciar sesión</h2>
            <p>El acceso es por invitación. Si aún no tienes cuenta, pídela a quien te compartió Finanzas.</p>
          </Encabezado>

          <Panel $sacudir={sacudiendo}>
            <FormularioInicioSesion alError={avisarError} />
          </Panel>

          <PieOffline>
            <IconoSinConexion tam={16} /> Funciona sin conexión · Tus datos son privados
          </PieOffline>
        </Hoja>
      </Tarjeta>
    </Pagina>
  );
};

export default PaginaAuth;
