import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import logoMarca from "../../img/logo-marca.png";
import cerrarSesion from "../../firebase/cerrarSesion";
import { IconoInicio, IconoLista, IconoCategorias, IconoSalir } from "../iconos";

const entrar = keyframes`from { opacity: 0; transform: translateY(0.5rem); } to { opacity: 1; transform: none; }`;

const Marco = styled.div`
  position: relative;
  z-index: 100;
  min-height: 100vh;
  min-height: 100dvh;
  background: ${theme.fondo};
  color: ${theme.tinta};
  font-family: "Work Sans", sans-serif;

  & ::selection {
    background: rgba(91, 105, 226, 0.22);
  }

  @media (min-width: 60rem) {
    display: grid;
    grid-template-columns: 16.5rem minmax(0, 1fr);
  }
`;

const SaltarAlContenido = styled.a`
  position: absolute;
  left: 1rem;
  top: -4rem;
  z-index: 3000;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: ${theme.tinta};
  color: #fff;
  font-weight: 600;
  transition: top 0.2s ease;

  &:focus {
    top: 1rem;
  }
`;

// ---- Barra superior (móvil) ----
const Superior = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: max(0.75rem, env(safe-area-inset-top)) 1.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid ${theme.borde};

  @media (min-width: 60rem) {
    display: none;
  }
`;

const BotonSalirMovil = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: ${theme.tintaSuave};
  cursor: pointer;
  touch-action: manipulation;

  &:hover {
    background: ${theme.campo};
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const Marca = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: 0.95rem;
  white-space: nowrap;
  color: ${theme.tinta};

  img {
    display: block;
    width: 2rem;
    height: 2rem;
  }

  small {
    display: block;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: ${theme.tintaSuave};
  }
`;

// ---- Barra lateral (escritorio) y barra inferior (móvil): la misma navegación ----
const Navegacion = styled.nav`
  display: flex;

  /* Móvil: barra inferior fija con safe-area */
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  justify-content: space-around;
  padding: 0.35rem 0.75rem max(0.5rem, env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: saturate(1.4) blur(10px);
  border-top: 1px solid ${theme.borde};

  @media (min-width: 60rem) {
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.35rem;
    padding: 1.5rem 1rem;
    background: #fff;
    border-top: 0;
    border-right: 1px solid ${theme.borde};
    backdrop-filter: none;
  }
`;

const MarcaLateral = styled(Marca)`
  display: none;

  @media (min-width: 60rem) {
    display: flex;
    margin: 0 0.5rem 1.5rem;
    white-space: normal;
  }
`;

const Enlace = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 4.5rem;
  min-height: 3.25rem;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${theme.tintaSuave};
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
  touch-action: manipulation;

  &.active {
    background: ${theme.violetaSuave};
    color: #3e4bc7;
  }

  &:hover:not(.active) {
    background: ${theme.campo};
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }

  @media (min-width: 60rem) {
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.85rem;
    min-height: 3rem;
    padding: 0 1rem;
    font-size: 1rem;
    border-radius: 0.875rem;

    &.active {
      background: ${theme.colorPrimario};
      color: #fff;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Salir = styled.button`
  display: none;

  @media (min-width: 60rem) {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-top: auto;
    min-height: 3rem;
    padding: 0 1rem;
    border: 0;
    border-top: 1px solid ${theme.borde};
    border-radius: 0;
    background: none;
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    color: ${theme.tintaSuave};
    cursor: pointer;

    &:hover {
      color: ${theme.tinta};
    }

    &:focus-visible {
      outline: 3px solid ${theme.colorPrimario};
      outline-offset: 2px;
    }
  }
`;

const Contenido = styled.main`
  min-width: 0;
  overflow-x: clip; /* nada de lo que haya dentro debe ensanchar la página */
  padding: 1.25rem 1.25rem calc(9rem + env(safe-area-inset-bottom));
  outline: 0;

  @media (min-width: 60rem) {
    padding: 2rem 2.5rem 3rem;
  }
`;

//Cada cambio de pantalla entra con un pequeño desplazamiento (se desactiva con «reducir movimiento»)
const Pantalla = styled.div`
  animation: ${entrar} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const AppShell = () => {
  const { pathname } = useLocation();
  return (
    <Marco>
      <SaltarAlContenido href="#contenido">Saltar al contenido</SaltarAlContenido>
      <Superior>
        <Marca>
          <img src={logoMarca} width="32" height="32" alt="" />
          <span>Lista de Gastos</span>
        </Marca>
        <BotonSalirMovil type="button" aria-label="Cerrar sesión" onClick={() => cerrarSesion()}>
          <IconoSalir tam={22} />
        </BotonSalirMovil>
      </Superior>

      <Navegacion aria-label="Principal">
        <MarcaLateral>
          <img src={logoMarca} width="40" height="40" alt="" />
          <div>
            Lista de Gastos
            <small>Control de gastos</small>
          </div>
        </MarcaLateral>
        <Enlace to="/" end>
          <IconoInicio tam={22} />
          Inicio
        </Enlace>
        <Enlace to="/lista">
          <IconoLista tam={22} />
          Lista
        </Enlace>
        <Enlace to="/categorias">
          <IconoCategorias tam={22} />
          Categorías
        </Enlace>
        <Salir type="button" onClick={() => cerrarSesion()}>
          <IconoSalir tam={22} />
          Cerrar sesión
        </Salir>
      </Navegacion>

      <Contenido id="contenido" tabIndex={-1}>
        <Pantalla key={pathname}>
          <Outlet />
        </Pantalla>
      </Contenido>
    </Marco>
  );
};

export default AppShell;
