import React, { useCallback, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useDrag } from "@use-gesture/react";
import theme from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { ReactComponent as Ilustracion } from "../../img/undraw_mobile_payments.svg";
import logoMarca from "../../img/logo-marca.png";
import FormularioInicioSesion from "./FormularioInicioSesion";
import FormularioRegistro from "./FormularioRegistro";
import { IconoSinConexion, IconoCampana, IconoRayo } from "./iconos";
import { Oculto } from "./elementos";

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

const Selector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.3rem;
  background: ${theme.campo};
  border: 1px solid ${theme.borde};
  border-radius: 999px;
`;

const Pestana = styled.button`
  min-height: 2.75rem;
  border: 0;
  border-radius: 999px;
  background: ${(p) => (p.$activa ? "#fff" : "transparent")};
  box-shadow: ${(p) => (p.$activa ? "0 2px 8px rgba(20, 22, 31, 0.1)" : "none")};
  font: inherit;
  font-size: 0.9375rem;
  font-weight: ${(p) => (p.$activa ? 700 : 500)};
  color: ${(p) => (p.$activa ? "#3e4bc7" : theme.tintaSuave)};
  cursor: pointer;
  transition: background-color 0.25s ease, box-shadow 0.25s ease, color 0.25s ease;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Puntos = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  margin-top: -0.4rem;

  span {
    width: 1.1rem;
    height: 0.4rem;
    border-radius: 999px;
    background: #c3c9f2;
    transform: scaleX(0.364); /* el punto inactivo es un círculo de 0,4 rem */
    transition: transform 0.3s ${SALIDA_EXPO}, background-color 0.3s ease;
  }

  span[data-activo="true"] {
    transform: none;
    background: ${theme.colorPrimario};
  }

  @media (prefers-reduced-motion: reduce) {
    span {
      transition: none;
    }
  }
`;

//Ventana del carrusel de formularios. El margen negativo deja espacio para que no se
//recorte el anillo de foco de los campos.
const Visor = styled.div`
  overflow: hidden;
  /* El relleno inferior deja sitio a la sombra del botón; el margen negativo lo compensa */
  margin: 0 -0.5rem -1rem;
  padding: 0.35rem 0.5rem 1.35rem;
  touch-action: pan-y;
`;

const Pista = styled.div`
  display: flex;
  width: 200%;
  /* Mientras se arrastra con el dedo sigue al dedo al instante; al soltar, desliza con suavidad */
  transition: ${(p) => (p.$arrastrando ? "none" : `transform 0.45s ${SALIDA_EXPO}`)};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Panel = styled.div`
  width: 50%;
  padding: 0 0.5rem;
  visibility: ${(p) => (p.$activo ? "visible" : "hidden")};
  /* El panel inactivo se oculta DESPUÉS de deslizarse: así no queda enfocable con el teclado */
  transition: visibility 0s linear ${(p) => (p.$activo ? "0s" : "0.45s")};
  animation: ${(p) => (p.$sacudir ? sacudir : "none")} 0.4s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
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
const RUTAS = { entrar: "/inicio-sesion", crear: "/crear-cuenta" };
const UMBRAL_DISTANCIA = 0.28; //fracción del ancho que hay que arrastrar para cambiar de panel
const UMBRAL_VELOCIDAD = 0.45;

const vibrar = () => {
  try {
    if (navigator.vibrate) navigator.vibrate(40);
  } catch (error) {
    //no todos los dispositivos permiten vibrar
  }
};

const PaginaAuth = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const modo = pathname === RUTAS.crear ? "crear" : "entrar";
  const indice = modo === "crear" ? 1 : 0;

  const visor = useRef(null);
  const [arrastre, cambiarArrastre] = useState(0);
  const [arrastrando, cambiarArrastrando] = useState(false);
  const [sacudiendo, cambiarSacudiendo] = useState(false);
  const [compactoManual, cambiarCompactoManual] = useState(false);
  const [enfocado, cambiarEnfocado] = useState(false);
  const compacto = compactoManual || enfocado;

  //La URL refleja el panel activo, así se puede compartir o recargar en el mismo sitio
  const cambiarModo = useCallback(
    (nuevo) => {
      if (nuevo !== modo) navigate(RUTAS[nuevo], { replace: true });
    },
    [modo, navigate]
  );

  //Error de validación o de acceso: sacudida del panel + vibración corta (Android)
  const avisarError = useCallback(() => {
    cambiarSacudiendo(true);
    vibrar();
    window.setTimeout(() => cambiarSacudiendo(false), 450);
  }, []);

  //Deslizar el formulario hacia los lados cambia de panel (solo con el dedo)
  const gestosVisor = useDrag(
    ({ active, last, movement: [mx], velocity: [vx], tap }) => {
      if (tap) return;
      const ancho = visor.current ? visor.current.offsetWidth : 1;
      if (active) {
        //Más allá del primer o del último panel no hay nada: se arrastra con resistencia
        const haciaElVacio = (indice === 0 && mx > 0) || (indice === 1 && mx < 0);
        cambiarArrastrando(true);
        cambiarArrastre(haciaElVacio ? mx * 0.18 : mx);
      }
      if (last) {
        cambiarArrastrando(false);
        cambiarArrastre(0);
        if (vx > UMBRAL_VELOCIDAD || Math.abs(mx) > ancho * UMBRAL_DISTANCIA) {
          //Se usa el signo del desplazamiento total: al soltar, la «dirección» del gesto llega en cero
          if (mx < 0 && indice === 0) cambiarModo("crear");
          if (mx > 0 && indice === 1) cambiarModo("entrar");
        }
      }
    },
    { axis: "x", filterTaps: true, threshold: 10, pointer: { touch: true } }
  );

  //Arrastrar el asa hacia arriba oculta la cabecera; hacia abajo la muestra
  const gestosAsa = useDrag(
    ({ last, movement: [, my], tap }) => {
      if (tap || !last) return;
      if (my < -28) cambiarCompactoManual(true);
      if (my > 28) cambiarCompactoManual(false);
    },
    { axis: "y", filterTaps: true, threshold: 6, pointer: { touch: true } }
  );

  //Con las flechas se navega entre pestañas, como en cualquier selector accesible
  const alPresionarPestana = (e) => {
    if (e.key === "ArrowRight") cambiarModo("crear");
    if (e.key === "ArrowLeft") cambiarModo("entrar");
  };

  //Cuando hay un campo enfocado (teclado abierto en el móvil) se libera espacio
  const alEnfocar = () => cambiarEnfocado(true);
  const alDesenfocar = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) cambiarEnfocado(false);
  };

  if (usuario) return <Navigate to="/" replace />;

  const titulo = modo === "crear" ? "Crear cuenta" : "Iniciar sesión";

  return (
    <Pagina>
      <Helmet>
        <title>{titulo} · Lista de Gastos</title>
      </Helmet>

      <Tarjeta>
        {/* Cabecera de marca: solo en móvil */}
        <Hero>
          <Marca>
            <img src={logoMarca} width="40" height="40" alt="" />
            <span>Lista de Gastos</span>
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
            <span>Lista de Gastos</span>
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

          <Selector role="tablist" aria-label="Acceso a tu cuenta" onKeyDown={alPresionarPestana}>
            <Pestana
              type="button"
              role="tab"
              id="pestana-entrar"
              aria-controls="panel-entrar"
              aria-selected={modo === "entrar"}
              tabIndex={modo === "entrar" ? 0 : -1}
              $activa={modo === "entrar"}
              onClick={() => cambiarModo("entrar")}
            >
              Iniciar sesión
            </Pestana>
            <Pestana
              type="button"
              role="tab"
              id="pestana-crear"
              aria-controls="panel-crear"
              aria-selected={modo === "crear"}
              tabIndex={modo === "crear" ? 0 : -1}
              $activa={modo === "crear"}
              onClick={() => cambiarModo("crear")}
            >
              Crear cuenta
            </Pestana>
          </Selector>

          <Puntos aria-hidden="true">
            <span data-activo={modo === "entrar"} />
            <span data-activo={modo === "crear"} />
          </Puntos>

          <Oculto aria-live="polite">{modo === "crear" ? "Formulario para crear cuenta" : "Formulario para iniciar sesión"}</Oculto>

          <Visor ref={visor} {...gestosVisor()}>
            <Pista $arrastrando={arrastrando} style={{ transform: `translateX(calc(${-indice * 50}% + ${arrastre}px))` }}>
              <Panel role="tabpanel" id="panel-entrar" aria-labelledby="pestana-entrar" $activo={modo === "entrar"} $sacudir={sacudiendo && modo === "entrar"}>
                <FormularioInicioSesion alError={avisarError} />
              </Panel>
              <Panel role="tabpanel" id="panel-crear" aria-labelledby="pestana-crear" $activo={modo === "crear"} $sacudir={sacudiendo && modo === "crear"}>
                <FormularioRegistro alError={avisarError} />
              </Panel>
            </Pista>
          </Visor>

          <PieOffline>
            <IconoSinConexion tam={16} /> Funciona sin conexión · Tus datos son privados
          </PieOffline>
        </Hoja>
      </Tarjeta>
    </Pagina>
  );
};

export default PaginaAuth;
