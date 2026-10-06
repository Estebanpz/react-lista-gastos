import React from "react";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import { estadoCliente, textoEstado, nivelUso, porcentajeUso } from "../../functions/planes";

//Colores con contraste AA; el estado siempre lleva texto además del color
export const TONOS = {
  activo: { fondo: theme.verdeSuave, texto: theme.verdeTexto },
  prueba: { fondo: theme.violetaSuave, texto: "#3E4BC7" },
  "por-vencer": { fondo: "#FEF0C7", texto: "#93370D" },
  vencido: { fondo: "#FDE8E8", texto: "#B42318" },
  suspendido: { fondo: "#E8EAEE", texto: "#3B4252" },
  "sin-plan": { fondo: "#E8EAEE", texto: "#3B4252" },
};

const Pastilla = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 1.6rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  background: ${(p) => TONOS[p.$estado].fondo};
  color: ${(p) => TONOS[p.$estado].texto};
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;

  &::before {
    content: "";
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: currentColor;
  }
`;

export const PastillaEstado = ({ cliente, ahora }) => <Pastilla $estado={estadoCliente(cliente, ahora)}>{textoEstado(cliente, ahora)}</Pastilla>;

const llenar = keyframes`from { transform: scaleX(0); }`;
const COLOR_NIVEL = { ok: "#2F8F46", aviso: "#C2570C", limite: "#C62828" };

const Pista = styled.div`
  height: 0.6rem;
  border-radius: 999px;
  background: ${theme.grisClaro};
  overflow: hidden;
`;

const Relleno = styled.div`
  height: 100%;
  width: ${(p) => p.$pct}%;
  border-radius: 999px;
  background: ${(p) => COLOR_NIVEL[p.$nivel]};
  transform-origin: left;
  animation: ${llenar} 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

//Barra de uso con valor numérico y descripción para lectores de pantalla
export const Medidor = ({ etiqueta, usado, limite }) => {
  const nivel = nivelUso(usado, limite);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.875rem", marginBottom: "0.35rem" }}>
        <span style={{ fontWeight: 600, color: theme.tinta }}>{etiqueta}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: theme.tintaSuave, whiteSpace: "nowrap" }}>
          {usado.toLocaleString("es-CO")} de {limite.toLocaleString("es-CO")}
        </span>
      </div>
      <Pista role="meter" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={limite} aria-valuenow={Math.min(usado, limite)} aria-valuetext={`${usado} de ${limite}`}>
        <Relleno $pct={porcentajeUso(usado, limite)} $nivel={nivel} />
      </Pista>
    </div>
  );
};

//Fecha corta «6 oct 2026» para vencimientos y pagos
export const fechaCorta = (ts) => {
  const ms = ts && ts.toMillis ? ts.toMillis() : Number(ts);
  return ms ? new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }).replace(".", "") : "—";
};
