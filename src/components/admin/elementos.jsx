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

//Colores de la barra partida (≥ 3:1 sobre la pista gris, WCAG 1.4.11). El nivel (80 %, 100 %) se avisa en el número.
export const COLOR_VARIABLES = theme.colorPrimario;
export const COLOR_FIJOS = "#0F766E";
const TEXTO_NIVEL = { ok: theme.tintaSuave, aviso: "#93370D", limite: "#B42318" };

const PistaPartida = styled(Pista)`
  display: flex;
`;

const Parte = styled.div`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  transform-origin: left;
  animation: ${llenar} 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Leyenda = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  color: ${theme.tintaSuave};

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  i {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }

  b {
    color: ${theme.tinta};
    font-variant-numeric: tabular-nums;
  }
`;

//Barra del mes partida: gastos variables + pagos de gastos fijos frente al cupo mensual (un solo cupo para ambos)
export const MedidorPartido = ({ etiqueta, variables, fijos, limite }) => {
  const total = variables + fijos;
  const nivel = nivelUso(total, limite);
  const pctTotal = porcentajeUso(total, limite);
  const pctFijos = total ? Math.round((pctTotal * fijos) / total) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.875rem", marginBottom: "0.35rem" }}>
        <span style={{ fontWeight: 600, color: theme.tinta }}>{etiqueta}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: TEXTO_NIVEL[nivel], fontWeight: nivel === "ok" ? 400 : 700, whiteSpace: "nowrap" }}>
          {total.toLocaleString("es-CO")} de {limite.toLocaleString("es-CO")}
        </span>
      </div>
      <PistaPartida
        role="meter"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={limite}
        aria-valuenow={Math.min(total, limite)}
        aria-valuetext={`${total} de ${limite}: ${variables} variables y ${fijos} fijos`}
      >
        <Parte $pct={pctTotal - pctFijos} $color={COLOR_VARIABLES} />
        <Parte $pct={pctFijos} $color={COLOR_FIJOS} />
      </PistaPartida>
      <Leyenda aria-hidden="true">
        <span>
          <i style={{ background: COLOR_VARIABLES }} />
          Variables <b>{variables.toLocaleString("es-CO")}</b>
        </span>
        <span>
          <i style={{ background: COLOR_FIJOS }} />
          Fijos <b>{fijos.toLocaleString("es-CO")}</b>
        </span>
      </Leyenda>
    </div>
  );
};

const BotonPagina = styled.button`
  min-height: 2.75rem;
  padding: 0 0.9rem;
  border: 1px solid ${theme.bordeCampo};
  border-radius: 999px;
  background: #fff;
  color: ${theme.tinta};
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  &:focus-visible {
    outline: 3px solid ${theme.azulClaro};
    outline-offset: 2px;
  }
`;

//Paginación de las listas de la ficha: «Más recientes» / «Anteriores». Con una sola página no se muestra.
export const Paginador = ({ etiqueta, pagina, paginas, alCambiar }) =>
  paginas <= 1 ? null : (
    <nav aria-label={etiqueta} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginTop: "0.75rem" }}>
      <BotonPagina type="button" onClick={() => alCambiar(pagina - 1)} disabled={pagina <= 1}>
        Más recientes
      </BotonPagina>
      <span aria-live="polite" style={{ fontSize: "0.875rem", color: theme.tintaSuave, fontVariantNumeric: "tabular-nums" }}>
        Página {pagina} de {paginas}
      </span>
      <BotonPagina type="button" onClick={() => alCambiar(pagina + 1)} disabled={pagina >= paginas}>
        Anteriores
      </BotonPagina>
    </nav>
  );

//Fecha corta «6 oct 2026» para vencimientos y pagos
export const fechaCorta = (ts) => {
  const ms = ts && ts.toMillis ? ts.toMillis() : Number(ts);
  return ms ? new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }).replace(".", "") : "—";
};
