import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Helmet } from "react-helmet";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import useMediaQuery from "../../Hooks/useMediaQuery";
import { useRecurrentes } from "../../contexts/RecurrentesContext";
import { useCategorias } from "../../contexts/CategoriasContext";
import { useCliente } from "../../contexts/ClienteContext";
import { borrarRecurrente, pausarRecurrente, omitirPago } from "../../firebase/recurrentes";
import { sumarDias, diasEntre, vencimientosHasta } from "../../functions/recurrencias";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import FilaRecurrente from "../recurrentes/FilaRecurrente";
import DetalleRecurrente from "../recurrentes/DetalleRecurrente";
import HojaRecurrente from "../recurrentes/HojaRecurrente";
import HojaRegistrarPago from "../recurrentes/HojaRegistrarPago";
import TarjetaAvisos from "../recurrentes/TarjetaAvisos";
import { estadoVisible } from "../recurrentes/EstadoPago";
import ConfirmarBorrado from "../gastos/ConfirmarBorrado";
import Hoja from "../Hoja";
import Ilustracion from "../Ilustracion";
import { BotonPrincipal } from "../auth/elementos";
import { IconoMas } from "../iconos";

const entrar = keyframes`from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; }`;

const Cabecera = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  h1 {
    text-wrap: balance;
    font-size: clamp(1.6rem, 6vw, 2.1rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.2rem;
    color: ${theme.tintaSuave};
  }
`;

const BotonNuevo = styled(BotonPrincipal)`
  display: none;

  @media ${theme.pantallaAncha} {
    display: inline-flex;
    width: auto;
    padding: 0 1.4rem;
    gap: 0.4rem;
  }
`;

const Diseno = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  margin-top: 1rem;

  @media ${theme.dosColumnas} {
    grid-template-columns: minmax(0, 1fr) 22rem;
    gap: 1.5rem;
    align-items: start;
  }
`;

const Resumen = styled.section`
  padding: 1.1rem 1.2rem;
  border: 1px solid ${theme.borde};
  border-radius: 1.5rem;
  background: #fff;

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  h2 {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  header span {
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    background: ${theme.violetaSuave};
    color: #3e4bc7;
    font-size: 0.8125rem;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 0.35rem;
    font-size: clamp(1.8rem, 7vw, 2.3rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px solid ${theme.borde};
    font-size: 0.875rem;
    font-weight: 600;
    color: ${(p) => (p.$urgente ? "#93370D" : theme.tintaSuave)};
  }
`;

const Grupo = styled.section`
  margin-top: 1.25rem;
  animation: ${entrar} 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${(p) => p.$indice * 0.05}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  h2 {
    padding: 0 0.25rem 0.5rem;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${(p) => (p.$vencidos ? "#B42318" : theme.tintaSuave)};
  }

  ul {
    list-style: none;
    display: grid;
    gap: 0.6rem;
  }
`;

const Lateral = styled.aside`
  display: none;

  @media ${theme.dosColumnas} {
    display: grid;
    gap: 1rem;
    position: sticky;
    top: 2rem;
  }
`;

const Panel = styled.section`
  padding: 1.25rem;
  border: 1px solid ${theme.borde};
  border-radius: 1.5rem;
  background: #fff;

  & > h2 {
    margin-bottom: 1rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }
`;

const Vacio = styled.div`
  margin-top: 1rem;
  padding: 2rem 1rem;
  border: 1px dashed ${theme.bordeCampo};
  border-radius: 1.5rem;
  text-align: center;

  strong {
    display: block;
    margin-top: 0.75rem;
    font-size: 1.15rem;
    color: ${theme.tinta};
  }

  p {
    margin: 0.4rem auto 1rem;
    max-width: 26rem;
    line-height: 1.45;
    color: ${theme.tintaSuave};
  }

  button {
    width: auto;
    padding: 0 1.4rem;
  }
`;

const Flotante = styled.button`
  position: fixed;
  right: 1rem;
  bottom: calc(5.75rem + env(safe-area-inset-bottom));
  z-index: 150; /* se pinta en <body>: encima del marco de la app (100), debajo de avisos (1500+) y hojas (2000) */
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 3.5rem;
  padding: 0 1.4rem;
  border: 0;
  border-radius: 999px;
  background: #3e4bc7;
  color: #fff;
  font: inherit;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(62, 75, 199, 0.35);
  cursor: pointer;
  touch-action: manipulation;

  &:hover:not(:disabled) {
    background: #2f3aa8;
  }

  &:disabled {
    background: #C3C9F2;
    color: #4A5568;
    box-shadow: none;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 3px;
  }

  @media ${theme.pantallaAncha} {
    display: none;
  }
`;

const Aviso = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
`;

const GRUPOS = [
  { id: "vencidos", titulo: "Vencidos" },
  { id: "semana", titulo: "Esta semana" },
  { id: "adelante", titulo: "Más adelante" },
  { id: "pausados", titulo: "Pausados" },
];

const grupoDe = (rec, hoy) => {
  const estado = estadoVisible(rec, hoy);
  if (estado === "pausado") return "pausados";
  if (estado === "vencido") return "vencidos";
  return diasEntre(hoy, rec.proximaFecha) <= 7 ? "semana" : "adelante";
};

const MENSAJES = { pagado: "Pago registrado como gasto.", omitido: "Pago omitido: pasa al siguiente vencimiento.", guardado: "Pago guardado.", borrado: "Pago borrado." };

const PaginaRecurrentes = () => {
  const { recurrentes, cargando, error, hoy } = useRecurrentes();
  const { porId } = useCategorias();
  const { puedeEscribir } = useCliente(); //plan vencido: se puede ver pero no crear ni registrar pagos
  const esEscritorio = useMediaQuery(theme.dosColumnas); //panel lateral (si no, detalle y avisos en la columna/hoja)

  const [seleccionadoId, cambiarSeleccionadoId] = useState(null);
  const [detalleAbierto, cambiarDetalleAbierto] = useState(false);
  const [edicion, cambiarEdicion] = useState(null); //{recurrente?} abierta para crear o editar
  const [aPagar, cambiarAPagar] = useState(null);
  const [aBorrar, cambiarABorrar] = useState(null);
  const [mensaje, cambiarMensaje] = useState("");

  const grupos = useMemo(() => {
    const mapa = Object.fromEntries(GRUPOS.map((g) => [g.id, []]));
    recurrentes.forEach((r) => mapa[grupoDe(r, hoy)].push(r));
    return mapa;
  }, [recurrentes, hoy]);

  //Total de lo que hay que pagar en los próximos 30 días (cuenta cada vencimiento: quincenal = 2, etc.)
  const resumen = useMemo(() => {
    const hasta = sumarDias(hoy, 30);
    let total = 0;
    let pagos = 0;
    recurrentes.filter((r) => r.activo).forEach((r) => {
      const fechas = vencimientosHasta(r, hasta);
      pagos += fechas.length;
      total += fechas.length * Number(r.cantidad);
    });
    return { total, pagos, semana: grupos.vencidos.length + grupos.semana.length };
  }, [recurrentes, hoy, grupos]);

  const seleccionado = recurrentes.find((r) => r.id === seleccionadoId) || null;

  const elegir = (r) => {
    cambiarSeleccionadoId(r.id);
    if (!esEscritorio) cambiarDetalleAbierto(true);
  };

  const accion = async (promesa, clave) => {
    try {
      await promesa;
      cambiarMensaje(MENSAJES[clave]);
    } catch (e) {
      console.log(e);
      cambiarMensaje("No se pudo completar la acción. Inténtalo de nuevo.");
    }
  };

  const detalle = seleccionado && (
    <DetalleRecurrente
      recurrente={seleccionado}
      categoria={porId(seleccionado.categoria)}
      hoy={hoy}
      alRegistrar={puedeEscribir ? () => { cambiarDetalleAbierto(false); cambiarAPagar(seleccionado); } : undefined}
      alOmitir={() => accion(omitirPago(seleccionado), "omitido")}
      alEditar={() => { cambiarDetalleAbierto(false); cambiarEdicion({ recurrente: seleccionado }); }}
      alPausar={() => accion(pausarRecurrente(seleccionado.id, !seleccionado.activo), "guardado")}
      alBorrar={() => cambiarABorrar(seleccionado)}
    />
  );

  return (
    <>
      <Helmet>
        <title>Gastos fijos (pagos) · Finanzas</title>
      </Helmet>

      <Cabecera>
        <div>
          <h1>Gastos fijos (pagos)</h1>
          <p>Nómina, recibos y créditos que se repiten</p>
        </div>
        <BotonNuevo type="button" disabled={!puedeEscribir} onClick={() => cambiarEdicion({})}>
          <IconoMas tam={20} /> Nuevo gasto fijo
        </BotonNuevo>
      </Cabecera>

      <Aviso role="status">{cargando ? "Cargando pagos…" : mensaje}</Aviso>

      <Diseno>
        <div>
          {error && (
            <Vacio>
              <strong>No pudimos cargar tus pagos</strong>
              <p>Revisa tu conexión e inténtalo de nuevo.</p>
            </Vacio>
          )}

          {!cargando && !error && recurrentes.length === 0 && (
            <Vacio>
              <Ilustracion nombre="recordatorio" ancho="12rem" />
              <strong>Aún no tienes gastos fijos (pagos) programados</strong>
              <p>Agrega la nómina, el arriendo, los recibos o las cuotas que se repiten y te avisamos 3 días antes y el mismo día.</p>
              <BotonPrincipal type="button" disabled={!puedeEscribir} onClick={() => cambiarEdicion({})}>Programar un gasto fijo</BotonPrincipal>
            </Vacio>
          )}

          {recurrentes.length > 0 && (
            <>
              <Resumen aria-labelledby="resumen-pagos" $urgente={resumen.semana > 0}>
                <header>
                  <h2 id="resumen-pagos">Próximos 30 días</h2>
                  <span>{resumen.pagos === 1 ? "1 pago" : `${resumen.pagos} pagos`}</span>
                </header>
                <strong>{ConvertirAMoneda(resumen.total)}</strong>
                <p>
                  {resumen.semana === 0
                    ? "Nada vence esta semana."
                    : resumen.semana === 1
                    ? "1 pago vence esta semana o ya venció."
                    : `${resumen.semana} pagos vencen esta semana o ya vencieron.`}
                </p>
              </Resumen>

              {!esEscritorio && (
                <div style={{ marginTop: "1rem" }}>
                  <TarjetaAvisos />
                </div>
              )}

              {GRUPOS.filter((g) => grupos[g.id].length).map((g, i) => (
                <Grupo key={g.id} $indice={i} $vencidos={g.id === "vencidos"} aria-labelledby={`grupo-${g.id}`}>
                  <h2 id={`grupo-${g.id}`}>
                    {g.titulo} ({grupos[g.id].length})
                  </h2>
                  <ul>
                    {grupos[g.id].map((r) => (
                      <li key={r.id}>
                        <FilaRecurrente
                          recurrente={r}
                          categoria={porId(r.categoria)}
                          hoy={hoy}
                          seleccionada={esEscritorio && r.id === seleccionadoId}
                          alElegir={() => elegir(r)}
                          alRegistrar={puedeEscribir ? () => cambiarAPagar(r) : undefined}
                        />
                      </li>
                    ))}
                  </ul>
                </Grupo>
              ))}
            </>
          )}
        </div>

        <Lateral>
          {recurrentes.length > 0 && (
            <Panel aria-label="Detalle del pago">
              <h2>Detalle</h2>
              {detalle || <p style={{ color: theme.tintaSuave, lineHeight: 1.45 }}>Elige un pago de la lista para ver su detalle, registrarlo o editarlo.</p>}
            </Panel>
          )}
          <TarjetaAvisos siempre />
        </Lateral>
      </Diseno>

      {/* Fuera del contenedor animado: un transform en un ancestro rompe position: fixed */}
      {recurrentes.length > 0 &&
        ReactDOM.createPortal(
          <Flotante type="button" disabled={!puedeEscribir} onClick={() => cambiarEdicion({})}>
            <IconoMas tam={22} /> Nuevo gasto fijo
          </Flotante>,
          document.body
        )}

      {!esEscritorio && seleccionado && (
        <Hoja abierta={detalleAbierto} alCerrar={() => cambiarDetalleAbierto(false)} titulo="Detalle del pago">
          {detalle}
        </Hoja>
      )}

      <HojaRecurrente
        abierta={Boolean(edicion)}
        recurrente={edicion && edicion.recurrente}
        alCerrar={(guardado) => {
          cambiarEdicion(null);
          if (guardado) cambiarMensaje(MENSAJES.guardado);
        }}
      />

      {aPagar && (
        <HojaRegistrarPago
          recurrente={aPagar}
          alCerrar={(resultado) => {
            cambiarAPagar(null);
            if (resultado) cambiarMensaje(MENSAJES[resultado]);
          }}
        />
      )}

      <ConfirmarBorrado
        abierta={Boolean(aBorrar)}
        alCerrar={() => cambiarABorrar(null)}
        alConfirmar={async () => {
          await borrarRecurrente(aBorrar.id);
          if (seleccionadoId === aBorrar.id) cambiarSeleccionadoId(null);
          cambiarDetalleAbierto(false);
          cambiarMensaje(MENSAJES.borrado);
        }}
        titulo="¿Borrar este pago?"
        mensaje="Dejarás de recibir avisos de este pago. Los gastos que ya registraste no se borran."
        resumen={aBorrar ? `${aBorrar.descripcion} · ${ConvertirAMoneda(aBorrar.cantidad)}` : ""}
      />
    </>
  );
};

export default PaginaRecurrentes;
