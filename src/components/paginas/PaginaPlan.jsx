import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import { useCliente } from "../../contexts/ClienteContext";
import { useAuth } from "../../contexts/AuthContext";
import { useCategorias } from "../../contexts/CategoriasContext";
import { useRecurrentes } from "../../contexts/RecurrentesContext";
import { usePagosCliente } from "../../Hooks/useClientesAdmin";
import { PLANES, ETIQUETAS_LIMITE, diasParaVencer } from "../../functions/planes";
import { enlaceWhatsApp, mensajeRenovar } from "../../functions/contacto";
import { descargarBlob } from "../../functions/exportar";
import { armarReporte, nombreArchivoReporte, PERIODOS } from "../../functions/reporte";
import { obtenerTodosLosGastos } from "../../firebase/exportarGastos";
import FormatearCantidad from "../../functions/ConvertirAMoneda";
import Ilustracion from "../Ilustracion";
import { Espera, MensajeError } from "../auth/elementos";
import { BotonSecundario } from "../recurrentes/elementos";
import { IconoInstalar } from "../iconos";
import BotonInstalarApp from "../instalar/BotonInstalarApp";
import { Medidor, PastillaEstado, fechaCorta } from "../admin/elementos";

const entrar = keyframes`from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; }`;

const Cabecera = styled.header`
  h1 {
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

const Diseno = styled.div`
  display: grid;
  gap: 1.25rem;
  margin-top: 1.5rem;

  @media ${theme.dosColumnas} {
    grid-template-columns: minmax(0, 1fr) 22rem;
    align-items: start;
  }
`;

const Tarjeta = styled.section`
  padding: 1.35rem 1.35rem 1.5rem;
  border: 1px solid ${theme.borde};
  border-radius: 1.5rem;
  background: #fff;
  animation: ${entrar} 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: ${(p) => (p.$i || 0) * 70}ms;

  h2 {
    margin-bottom: 1rem;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Plan = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  strong {
    display: block;
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${theme.tinta};
  }

  small {
    color: ${theme.tintaSuave};
    font-size: 0.9375rem;
  }
`;

const Medidores = styled.div`
  display: grid;
  gap: 1.15rem;
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
`;

const EnlaceBoton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3.25rem;
  padding: 0 1.4rem;
  border-radius: 999px;
  background: ${theme.colorPrimario};
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  touch-action: manipulation;

  &:hover {
    background: #4a58d1;
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }
`;

const OpcionPeriodo = styled.button`
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 2px solid ${(p) => (p.$marcado ? "#3e4bc7" : theme.borde)};
  border-radius: 999px;
  background: ${(p) => (p.$marcado ? "#3e4bc7" : "#fff")};
  color: ${(p) => (p.$marcado ? "#fff" : theme.tinta)};
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }
`;

const PaginaPlan = () => {
  const { cargando, cliente, usoGastos, esAdmin, limites } = useCliente();
  const { usuario } = useAuth();
  const { propias, porId } = useCategorias();
  const { recurrentes } = useRecurrentes();
  const pagos = usePagosCliente(usuario ? usuario.uid : null);
  const [generando, cambiarGenerando] = useState(null); //"xlsx" | "pdf" mientras se prepara
  const [periodo, cambiarPeriodo] = useState("mes");
  const [error, cambiarError] = useState("");
  const [descargado, cambiarDescargado] = useState("");

  //El super admin no tiene plan: su pantalla es Clientes
  if (esAdmin) return <Navigate to="/admin" replace />;

  const plan = cliente && PLANES[cliente.plan];
  const dias = cliente ? diasParaVencer(cliente.vence) : null;
  const contacto = enlaceWhatsApp(mensajeRenovar(usuario && usuario.email, plan && plan.nombre));

  //Reporte detallado en Excel (.xlsx real) o PDF. Las librerías se cargan solo al pulsar (no pesan en la carga inicial).
  const generar = async (formato) => {
    cambiarGenerando(formato);
    cambiarError("");
    cambiarDescargado("");
    try {
      const gastos = await obtenerTodosLosGastos();
      const reporte = armarReporte({ gastos, recurrentes, porId, periodo, ahora: new Date(), correo: usuario ? usuario.email : "" });
      let blob;
      if (formato === "xlsx") {
        const { construirExcel } = await import(/* webpackChunkName: "exportar-xlsx" */ "../../utils/exportarExcel");
        blob = new Blob([construirExcel(reporte)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      } else {
        const { construirPdfBytes } = await import(/* webpackChunkName: "exportar-pdf" */ "../../utils/exportarPdf");
        blob = new Blob([construirPdfBytes(reporte)], { type: "application/pdf" });
      }
      const nombre = nombreArchivoReporte(reporte, formato);
      descargarBlob(nombre, blob);
      cambiarDescargado(nombre);
    } catch (e) {
      console.log(e);
      cambiarError("No pudimos preparar el archivo. Revisa tu conexión e inténtalo de nuevo.");
    }
    cambiarGenerando(null);
  };

  return (
    <>
      <Cabecera>
        <h1>Mi plan</h1>
        <p>Lo que incluye tu plan y cuánto llevas usado este mes.</p>
      </Cabecera>

      <Diseno>
        <div style={{ display: "grid", gap: "1.25rem", minWidth: 0 }}>
          <Tarjeta $i={0} aria-label="Plan actual">
            {cargando ? (
              <p role="status" style={{ color: theme.tintaSuave }}>Cargando…</p>
            ) : cliente ? (
              <Plan>
                <div>
                  <strong>{plan.nombre}</strong>
                  <small>
                    {plan.precio ? `${FormatearCantidad(plan.precio)} al mes` : "Gratis"} · vence el {fechaCorta(cliente.vence)}
                    {dias >= 0 ? ` (${dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`})` : ""}
                  </small>
                </div>
                <PastillaEstado cliente={cliente} />
              </Plan>
            ) : (
              <>
                <Ilustracion nombre="recordatorio" ancho="9rem" />
                <p style={{ marginTop: "0.75rem", textAlign: "center", color: theme.tintaSuave }}>Tu cuenta todavía no tiene un plan asignado.</p>
              </>
            )}
          </Tarjeta>

          {cliente && (
            <Tarjeta $i={1} aria-label="Uso del plan">
              <h2>Tu uso</h2>
              <Medidores>
                <Medidor etiqueta={`${ETIQUETAS_LIMITE.gastosMes} este mes`} usado={usoGastos} limite={limites.gastosMes} />
                <Medidor etiqueta={ETIQUETAS_LIMITE.pagosActivos} usado={recurrentes.filter((r) => r.activo).length} limite={limites.pagosActivos} />
                <Medidor etiqueta={ETIQUETAS_LIMITE.categorias} usado={propias.length} limite={limites.categorias} />
              </Medidores>
              <p style={{ marginTop: "1.1rem", fontSize: "0.875rem", color: theme.tintaSuave }}>
                Dispositivos con avisos: hasta {limites.dispositivos}. El cupo de gastos se reinicia cada mes.
              </p>
            </Tarjeta>
          )}

          <Tarjeta $i={2} aria-label="Descargar mis datos">
            <h2>Descargar mis datos</h2>
            <p style={{ marginBottom: "0.9rem", fontSize: "0.9375rem", lineHeight: 1.45, color: theme.tintaSuave }}>
              Reporte con cada gasto y pago por nombre, categoría, monto y fecha, y el estado de tus pagos recurrentes.
            </p>
            <div role="radiogroup" aria-label="Periodo del reporte" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {PERIODOS.map((p) => (
                <OpcionPeriodo key={p.id} type="button" role="radio" aria-checked={periodo === p.id} $marcado={periodo === p.id} onClick={() => cambiarPeriodo(p.id)}>
                  {p.etiqueta}
                </OpcionPeriodo>
              ))}
            </div>
            <Acciones style={{ marginTop: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
              <BotonSecundario type="button" onClick={() => generar("xlsx")} disabled={Boolean(generando)} aria-busy={generando === "xlsx"}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  {generando === "xlsx" ? <Espera aria-hidden="true" /> : <IconoInstalar tam={18} />}
                  Descargar Excel
                </span>
              </BotonSecundario>
              <BotonSecundario type="button" onClick={() => generar("pdf")} disabled={Boolean(generando)} aria-busy={generando === "pdf"}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  {generando === "pdf" ? <Espera aria-hidden="true" /> : <IconoInstalar tam={18} />}
                  Descargar PDF
                </span>
              </BotonSecundario>
            </Acciones>
            <p style={{ marginTop: "0.85rem", fontSize: "0.8125rem", lineHeight: 1.45, color: theme.tintaSuave }}>
              Tus datos son tuyos: puedes descargarlos en cualquier momento, incluso con el plan vencido.
            </p>
            {descargado && <p role="status" style={{ marginTop: "0.6rem", fontWeight: 600, color: theme.verdeTexto }}>Listo: «{descargado}» está en tu carpeta de descargas.</p>}
            {error && <MensajeError role="alert" style={{ marginTop: "0.6rem" }}>{error}</MensajeError>}
          </Tarjeta>

          {pagos && pagos.length > 0 && (
            <Tarjeta $i={2} aria-label="Pagos">
              <h2>Mis pagos</h2>
              <Pagos>
                {pagos.map((p) => (
                  <li key={p.id}>
                    <span>
                      {fechaCorta(p.fechaPago)} · {PLANES[p.plan].nombre}
                      <small>Cubre hasta el {fechaCorta(p.venceDespues)}</small>
                    </span>
                    <b>{FormatearCantidad(p.monto)}</b>
                  </li>
                ))}
              </Pagos>
            </Tarjeta>
          )}
        </div>

        <Tarjeta $i={1} aria-label="Acciones">
          <h2>Acciones</h2>
          <Acciones>
            <EnlaceBoton href={contacto} target="_blank" rel="noopener noreferrer">
              {cliente && dias < 0 ? "Renovar por WhatsApp" : "Renovar o cambiar de plan"}
            </EnlaceBoton>
            <BotonInstalarApp />
          </Acciones>
        </Tarjeta>
      </Diseno>
    </>
  );
};

export default PaginaPlan;
