import React, { useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Hoja from "../Hoja";
import { BotonPrincipal, MensajeError } from "../auth/elementos";
import { BotonSecundario } from "../recurrentes/elementos";
import { PLANES, ETIQUETAS_LIMITE, CLAVES_LIMITE } from "../../functions/planes";
import { suspenderCliente } from "../../firebase/clientes";
import { usePagosCliente } from "../../Hooks/useClientesAdmin";
import FormatearCantidad from "../../functions/ConvertirAMoneda";
import { Medidor, PastillaEstado, fechaCorta } from "./elementos";

const Datos = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1rem;

  dt {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  dd {
    margin-top: 0.15rem;
    font-weight: 600;
    color: ${theme.tinta};
    overflow-wrap: anywhere;
  }
`;

const Seccion = styled.section`
  margin-top: 1.5rem;

  h3 {
    margin-bottom: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }
`;

const Limites = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.9rem 0 0;
  padding: 0;
  list-style: none;

  li {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: ${theme.campo};
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
  }

  strong {
    color: ${theme.tinta};
  }
`;

const Pagos = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.7rem 0;
    border-top: 1px solid ${theme.borde};
    font-size: 0.9375rem;
  }

  small {
    display: block;
    color: ${theme.tintaSuave};
  }

  b {
    font-variant-numeric: tabular-nums;
  }
`;

const Acciones = styled.div`
  display: grid;
  gap: 0.6rem;
  margin-top: 1.5rem;
`;

//Detalle de un cliente: estado, vencimiento, uso del mes, límites, acciones e historial de pagos
const HojaCliente = ({ cliente, uso, ahora, alCerrar, alPagar, alEditar }) => {
  const pagos = usePagosCliente(cliente ? cliente.uid : null);
  const [error, cambiarError] = useState("");
  const [trabajando, cambiarTrabajando] = useState(false);
  if (!cliente) return null;
  const suspendido = cliente.estado === "suspendido";

  const alternarSuspension = async () => {
    cambiarTrabajando(true);
    cambiarError("");
    try {
      await suspenderCliente(cliente, !suspendido);
    } catch (e) {
      console.log(e);
      cambiarError("No pudimos cambiar el estado. Inténtalo de nuevo.");
    }
    cambiarTrabajando(false);
  };

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={cliente.nombre || cliente.correo} subtitulo={cliente.nombre ? cliente.correo : undefined}>
      <PastillaEstado cliente={cliente} ahora={ahora} />
      <Datos style={{ marginTop: "1.1rem" }}>
        <div>
          <dt>Plan</dt>
          <dd>
            {PLANES[cliente.plan].nombre} · {PLANES[cliente.plan].precio ? FormatearCantidad(PLANES[cliente.plan].precio) : "gratis"}
          </dd>
        </div>
        <div>
          <dt>Vence</dt>
          <dd>{fechaCorta(cliente.vence)}</dd>
        </div>
        <div>
          <dt>Cliente desde</dt>
          <dd>{fechaCorta(cliente.creado)}</dd>
        </div>
        {cliente.notas && (
          <div>
            <dt>Notas</dt>
            <dd>{cliente.notas}</dd>
          </div>
        )}
      </Datos>

      <Seccion aria-label="Uso del mes">
        <h3>Uso este mes</h3>
        <Medidor etiqueta={ETIQUETAS_LIMITE.gastosMes} usado={uso} limite={cliente.limites.gastosMes} />
        <Limites aria-label="Límites del plan">
          {CLAVES_LIMITE.filter((k) => k !== "gastosMes").map((k) => (
            <li key={k}>
              {ETIQUETAS_LIMITE[k]}: <strong>{cliente.limites[k]}</strong>
            </li>
          ))}
        </Limites>
      </Seccion>

      <Seccion aria-label="Pagos">
        <h3>Pagos registrados</h3>
        {pagos === null ? (
          <p role="status" style={{ color: theme.tintaSuave }}>Cargando…</p>
        ) : pagos.length === 0 ? (
          <p style={{ color: theme.tintaSuave }}>Todavía no hay pagos.</p>
        ) : (
          <Pagos>
            {pagos.map((p) => (
              <li key={p.id}>
                <span>
                  {fechaCorta(p.fechaPago)} · {PLANES[p.plan].nombre}
                  <small>{p.referencia ? `${p.referencia} · ` : ""}hasta el {fechaCorta(p.venceDespues)}</small>
                </span>
                <b>{FormatearCantidad(p.monto)}</b>
              </li>
            ))}
          </Pagos>
        )}
      </Seccion>

      {error && <MensajeError role="alert" style={{ marginTop: "1rem" }}>{error}</MensajeError>}
      <Acciones>
        <BotonPrincipal type="button" onClick={() => alPagar(cliente)}>
          Registrar pago
        </BotonPrincipal>
        <BotonSecundario type="button" onClick={() => alEditar(cliente)}>
          Cambiar plan o editar
        </BotonSecundario>
        <BotonSecundario type="button" onClick={alternarSuspension} disabled={trabajando} style={suspendido ? undefined : { color: "#B42318" }}>
          {suspendido ? "Reactivar acceso" : "Suspender"}
        </BotonSecundario>
      </Acciones>
    </Hoja>
  );
};

export default HojaCliente;
