import React from "react";
import styled from "styled-components";
import theme from "../../theme";
import { useCliente } from "../../contexts/ClienteContext";
import { useAuth } from "../../contexts/AuthContext";
import { diasParaVencer, PLANES } from "../../functions/planes";
import { enlaceWhatsApp, mensajeRenovar } from "../../functions/contacto";

const Caja = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1.1rem;
  border: 1px solid ${(p) => (p.$tono === "rojo" ? "#F4B8B1" : "#F5D9A0")};
  border-radius: 1.1rem;
  background: ${(p) => (p.$tono === "rojo" ? "#FDE8E8" : "#FEF0C7")};
  color: ${(p) => (p.$tono === "rojo" ? "#912018" : "#7A2E0E")};
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.4;

  p {
    flex: 1 1 18rem;
    min-width: 0;
    text-wrap: pretty;
  }

  a {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0 1.1rem;
    border-radius: 999px;
    background: ${(p) => (p.$tono === "rojo" ? "#B42318" : "#3e4bc7")};
    color: #fff;
    font-weight: 700;
    text-decoration: none;
    touch-action: manipulation;
  }

  a:hover {
    filter: brightness(0.9);
  }

  a:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }
`;

const Candado = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: "0.4rem" }}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

//Aviso fijo sobre el contenido cuando el plan no permite registrar (vencido, suspendido, sin plan) o está por vencer.
//Nunca bloquea ver ni descargar los datos propios.
const AvisoPlan = () => {
  const { cargando, estado, cliente, esAdmin } = useCliente();
  const { usuario } = useAuth();
  if (cargando || esAdmin) return null;

  const contacto = enlaceWhatsApp(mensajeRenovar(usuario && usuario.email, cliente && PLANES[cliente.plan] && PLANES[cliente.plan].nombre));
  const dias = cliente ? diasParaVencer(cliente.vence) : 0;

  if (estado === "vencido") {
    return (
      <Caja $tono="rojo" role="status">
        <p><Candado />Tu plan venció {dias === 0 ? "hoy" : dias === -1 ? "ayer" : `hace ${-dias} días`}. Puedes ver y descargar tus datos, pero no registrar nuevos gastos.</p>
        <a href={contacto} target="_blank" rel="noopener noreferrer">Renovar por WhatsApp</a>
      </Caja>
    );
  }
  if (estado === "suspendido") {
    return (
      <Caja $tono="rojo" role="status">
        <p><Candado />Tu acceso está suspendido. Puedes ver tus datos, pero no registrar nuevos gastos.</p>
        <a href={contacto} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
      </Caja>
    );
  }
  if (estado === "sin-plan") {
    return (
      <Caja $tono="rojo" role="status">
        <p><Candado />Tu cuenta todavía no tiene un plan asignado, así que no puedes registrar gastos. Pídelo a quien te dio acceso.</p>
        <a href={contacto} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
      </Caja>
    );
  }
  if (estado === "por-vencer") {
    return (
      <Caja $tono="ambar" role="status">
        <p>Tu plan {dias === 0 ? "vence hoy" : dias === 1 ? "vence mañana" : `vence en ${dias} días`}. Renuévalo para no perder la posibilidad de registrar gastos.</p>
        <a href={contacto} target="_blank" rel="noopener noreferrer">Renovar</a>
      </Caja>
    );
  }
  return null;
};

export default AvisoPlan;
