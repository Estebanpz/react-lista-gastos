import React, { Suspense, lazy, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import styled, { keyframes } from "styled-components";
import { fromUnixTime, addDays, addMonths, startOfMonth } from "date-fns";
import theme from "../../theme";
import useGastosRango from "../../Hooks/useGastosRango";
import useMediaQuery from "../../Hooks/useMediaQuery";
import { useCategorias } from "../../contexts/CategoriasContext";
import { rangoMes, rangoSemana, rangoTrimestre, rangoDias, etiquetaRango, totalGastos, porCategoria, agruparPorDia, agruparPorCategoria, filtrarGastos, ordenarGastos, etiquetaDia, etiquetaMes } from "../../functions/resumen";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import BorrarGasto from "../../firebase/BorrarGasto";
import FilaGasto from "../gastos/FilaGasto";
import FilaDeslizable from "../gastos/FilaDeslizable";
import DetalleGasto from "../gastos/DetalleGasto";
import ConfirmarBorrado from "../gastos/ConfirmarBorrado";
import BarraProgreso from "../graficas/BarraProgreso";
import Hoja from "../Hoja";
import Ilustracion from "../Ilustracion";
import { colorPorId } from "../../functions/paleta";
import { IconoBuscar, IconoIzquierda, IconoDerecha, IconoCerrar, IconoCalendario } from "../iconos";
import { BotonEnlace, BotonPrincipal } from "../auth/elementos";
import { useNavigate } from "react-router-dom";

const Calendario = lazy(() => import("../calendario/Calendario"));

const entrar = keyframes`from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; }`;

const Diseno = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;

  @media ${theme.dosColumnas} {
    grid-template-columns: minmax(0, 1fr) 22rem;
    gap: 1.5rem;
    align-items: start;
  }
`;

const Titulo = styled.h1`
  font-size: clamp(1.6rem, 6vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${theme.tinta};
`;

const Resumen = styled.section`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 1rem 0;

  @media (max-width: 40rem) {
    grid-template-columns: 1fr 1fr;
    div:first-child {
      grid-column: 1 / -1;
    }
  }

  div {
    padding: 0.9rem 1rem;
    border-radius: 1.1rem;
    background: #fff;
    border: 1px solid ${theme.borde};
    min-width: 0;
  }

  span {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  strong {
    display: block;
    margin-top: 0.2rem;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${theme.tinta};
  }
`;

const BarraMes = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const BotonRedondo = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid ${theme.borde};
  border-radius: 50%;
  background: #fff;
  color: ${theme.tinta};
  cursor: pointer;
  touch-action: manipulation;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const Mes = styled.p`
  min-width: 9rem;
  text-align: center;
  font-weight: 700;
  color: ${theme.tinta};
`;

const Segmentos = styled.div`
  display: inline-grid;
  grid-auto-flow: column;
  gap: 0.2rem;
  padding: 0.25rem;
  border: 1px solid ${theme.borde};
  border-radius: 999px;
  background: ${theme.campo};
  margin-left: auto;

  button {
    min-height: 2.5rem;
    padding: 0 1rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: ${theme.tintaSuave};
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  button[aria-pressed="true"] {
    background: #fff;
    color: #3e4bc7;
    box-shadow: 0 2px 8px rgba(20, 22, 31, 0.1);
  }

  button:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
`;

const SegmentosPeriodo = styled(Segmentos)`
  margin-left: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;

  button {
    white-space: nowrap;
  }
`;

const BotonRango = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1.1rem;
  border: 1px solid ${theme.bordeCampo};
  border-radius: 999px;
  background: #fff;
  font: inherit;
  font-weight: 700;
  color: ${theme.tinta};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const PieRango = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;

  p {
    font-weight: 700;
    color: ${theme.tinta};
  }

  button {
    width: auto;
    min-width: 8rem;
  }
`;

const Busqueda = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 12rem;
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 1px solid ${theme.bordeCampo};
  border-radius: 999px;
  background: #fff;
  color: ${theme.tintaSuave};

  &:focus-within {
    border-color: ${theme.colorPrimario};
    box-shadow: 0 0 0 3px rgba(91, 105, 226, 0.22);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 2.6rem;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    color: ${theme.tinta};
    caret-color: ${theme.colorPrimario};
  }

  input::placeholder {
    color: ${theme.placeholder};
    opacity: 1;
  }

  button {
    display: inline-flex;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    padding: 0.3rem;
  }
`;

const Seleccion = styled.select`
  min-height: 2.75rem;
  padding: 0 2rem 0 1rem;
  border: 1px solid ${theme.bordeCampo};
  border-radius: 999px;
  background-color: #fff;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${theme.tinta};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const Filtros = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0.25rem 0.5rem;
  margin: 0.5rem -0.25rem 0;
  scrollbar-width: thin;
`;

const Chip = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border: 1px solid ${(p) => (p.$marcado ? theme.colorPrimario : theme.borde)};
  border-radius: 999px;
  background: ${(p) => (p.$marcado ? theme.colorPrimario : "#fff")};
  color: ${(p) => (p.$marcado ? "#fff" : theme.tinta)};
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }
`;

const Grupo = styled.section`
  margin-top: 1.25rem;
  animation: ${entrar} 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${(p) => Math.min(p.$indice, 6) * 0.05}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0 0.25rem 0.4rem;
  }

  h2 {
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  header span {
    font-size: 0.8125rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
  }

  ul {
    list-style: none;
    display: grid;
    gap: 0.4rem;
  }
`;

const Panel = styled.aside`
  display: none;

  @media ${theme.dosColumnas} {
    display: block;
    position: sticky;
    top: 2rem;
    padding: 1.25rem;
    border: 1px solid ${theme.borde};
    border-radius: 1.5rem;
    background: #fff;
    box-shadow: 0 6px 20px rgba(20, 22, 31, 0.04);
  }

  h2 {
    margin-bottom: 1rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }
`;

const Vacio = styled.div`
  margin-top: 1.5rem;
  padding: 2rem 1rem;
  border: 1px dashed ${theme.bordeCampo};
  border-radius: 1.5rem;
  text-align: center;

  strong {
    display: block;
    margin-top: 0.75rem;
    font-size: 1.1rem;
    color: ${theme.tinta};
  }

  p {
    margin: 0.4rem auto 0;
    max-width: 24rem;
    color: ${theme.tintaSuave};
    line-height: 1.45;
  }
`;

const ORDENES = [
  { id: "reciente", texto: "Más reciente" },
  { id: "antiguo", texto: "Más antiguo" },
  { id: "mayor", texto: "Mayor valor" },
  { id: "menor", texto: "Menor valor" },
];

const formatoCorto = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const PERIODOS = [
  { id: "semana", texto: "Semana", total: "Total de la semana", resumen: "Resumen de la semana" },
  { id: "mes", texto: "Mes", total: "Total del mes", resumen: "Resumen del mes" },
  { id: "trimestre", texto: "3 meses", total: "Total de 3 meses", resumen: "Resumen de 3 meses" },
  { id: "personalizado", texto: "Personalizado", total: "Total del período", resumen: "Resumen del período" },
];

const PaginaLista = () => {
  const navigate = useNavigate();
  const { porId } = useCategorias();
  const esEscritorio = useMediaQuery(theme.dosColumnas); //panel de detalle al lado (si no, en hoja)
  const hoy = useMemo(() => new Date(), []);
  const [periodo, cambiarPeriodo] = useState("mes");
  const [ancla, cambiarAncla] = useState(hoy);
  const [rango, cambiarRango] = useState(null); //{from, to} del período personalizado
  const [borrador, cambiarBorrador] = useState(null);
  const [rangoAbierto, cambiarRangoAbierto] = useState(false);
  const [texto, cambiarTexto] = useState("");
  const [categoriasSel, cambiarCategoriasSel] = useState([]);
  const [orden, cambiarOrden] = useState("reciente");
  const [vista, cambiarVista] = useState("dia");
  const [seleccionadoId, cambiarSeleccionadoId] = useState(null);
  const [filaAbierta, cambiarFilaAbierta] = useState(null);
  const [detalleAbierto, cambiarDetalleAbierto] = useState(false);
  const [aBorrar, cambiarABorrar] = useState(null);

  //Rango consultado según el período elegido (semana y mes se pueden mover con las flechas)
  const info = useMemo(() => {
    let limites;
    if (periodo === "semana") limites = rangoSemana(ancla);
    else if (periodo === "trimestre") limites = rangoTrimestre(ancla);
    else if (periodo === "personalizado" && rango) limites = rangoDias(rango.from, rango.to);
    else limites = rangoMes(ancla);
    const [d, h] = limites;
    const ini = fromUnixTime(d);
    const fin = fromUnixTime(h);
    const etiqueta = periodo === "mes" ? etiquetaMes(ancla) : etiquetaRango(ini, fin, hoy);
    return { desde: d, hasta: h, etiqueta, esActual: fin >= hoy };
  }, [periodo, ancla, rango, hoy]);
  const { desde, hasta, etiqueta, esActual } = info;
  const textoPeriodo = PERIODOS.find((p) => p.id === periodo);
  const { gastos, cargando, error } = useGastosRango(desde, hasta);

  const presentes = useMemo(() => porCategoria(gastos).map((c) => c.id), [gastos]);
  const visibles = useMemo(() => ordenarGastos(filtrarGastos(gastos, { texto, categorias: categoriasSel }), orden), [gastos, texto, categoriasSel, orden]);
  const grupos = useMemo(() => (vista === "dia" ? agruparPorDia(visibles) : agruparPorCategoria(visibles)), [visibles, vista]);
  const hayFiltros = Boolean(texto.trim()) || categoriasSel.length > 0;
  const seleccionado = visibles.find((g) => g.id === seleccionadoId) || null;
  const mayor = porCategoria(gastos)[0];

  const reiniciarSeleccion = () => {
    cambiarSeleccionadoId(null);
    cambiarFilaAbierta(null);
  };

  const mover = (sentido) => {
    if (periodo === "semana") cambiarAncla(addDays(ancla, 7 * sentido));
    else cambiarAncla(startOfMonth(addMonths(ancla, (periodo === "trimestre" ? 3 : 1) * sentido)));
    reiniciarSeleccion();
  };

  const elegirPeriodo = (id) => {
    reiniciarSeleccion();
    if (id === "personalizado") {
      cambiarBorrador(rango || { from: addDays(hoy, -6), to: hoy });
      cambiarRangoAbierto(true);
      return;
    }
    cambiarPeriodo(id);
    cambiarAncla(hoy);
  };

  const aplicarRango = () => {
    if (!borrador?.from) return;
    cambiarRango({ from: borrador.from, to: borrador.to || borrador.from });
    cambiarPeriodo("personalizado");
    cambiarRangoAbierto(false);
  };

  const alternarCategoria = (id) => cambiarCategoriasSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  const limpiar = () => {
    cambiarTexto("");
    cambiarCategoriasSel([]);
  };

  const elegir = (g) => {
    cambiarSeleccionadoId(g.id);
    if (!esEscritorio) cambiarDetalleAbierto(true);
  };

  const confirmarBorrado = async () => {
    await BorrarGasto(aBorrar.id);
    if (seleccionadoId === aBorrar.id) cambiarSeleccionadoId(null);
    cambiarDetalleAbierto(false);
  };

  return (
    <>
      <Helmet>
        <title>Lista de gastos · Finanzas</title>
      </Helmet>

      <Titulo>Lista de gastos</Titulo>

      <Resumen aria-label={textoPeriodo.resumen} aria-busy={cargando}>
        <div>
          <span>{textoPeriodo.total}</span>
          <strong>{ConvertirAMoneda(totalGastos(gastos))}</strong>
        </div>
        <div>
          <span>Gastos</span>
          <strong>{gastos.length}</strong>
        </div>
        <div>
          <span>Mayor categoría</span>
          <strong>{mayor ? porId(mayor.id).texto : "—"}</strong>
        </div>
      </Resumen>

      <BarraMes>
        <SegmentosPeriodo role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" aria-pressed={periodo === p.id} onClick={() => elegirPeriodo(p.id)}>{p.texto}</button>
          ))}
        </SegmentosPeriodo>
      </BarraMes>

      <BarraMes style={{ marginTop: "0.75rem" }}>
        {periodo === "personalizado" ? (
          <BotonRango type="button" aria-haspopup="dialog" onClick={() => { cambiarBorrador(rango); cambiarRangoAbierto(true); }}>
            <IconoCalendario tam={18} />
            {etiqueta}
          </BotonRango>
        ) : (
          <>
            <BotonRedondo type="button" aria-label={periodo === "semana" ? "Semana anterior" : periodo === "trimestre" ? "3 meses anteriores" : "Mes anterior"} onClick={() => mover(-1)}>
              <IconoIzquierda tam={20} />
            </BotonRedondo>
            <Mes aria-live="polite">{etiqueta}</Mes>
            <BotonRedondo type="button" aria-label={periodo === "semana" ? "Semana siguiente" : periodo === "trimestre" ? "3 meses siguientes" : "Mes siguiente"} disabled={esActual} onClick={() => mover(1)}>
              <IconoDerecha tam={20} />
            </BotonRedondo>
          </>
        )}
        <Segmentos role="group" aria-label="Agrupar gastos">
          <button type="button" aria-pressed={vista === "dia"} onClick={() => cambiarVista("dia")}>Por día</button>
          <button type="button" aria-pressed={vista === "categoria"} onClick={() => cambiarVista("categoria")}>Por categoría</button>
        </Segmentos>
      </BarraMes>

      <BarraMes style={{ marginTop: "0.75rem" }}>
        <Busqueda>
          <IconoBuscar tam={18} />
          <input type="search" name="busqueda" aria-label="Buscar gastos" placeholder="Buscar por descripción…" autoComplete="off" spellCheck={false} value={texto} onChange={(e) => cambiarTexto(e.target.value)} />
          {texto && (
            <button type="button" aria-label="Borrar búsqueda" onClick={() => cambiarTexto("")}>
              <IconoCerrar tam={16} />
            </button>
          )}
        </Busqueda>
        <label>
          <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Ordenar por</span>
          <Seleccion name="orden" value={orden} onChange={(e) => cambiarOrden(e.target.value)} aria-label="Ordenar por">
            {ORDENES.map((o) => (
              <option key={o.id} value={o.id}>{o.texto}</option>
            ))}
          </Seleccion>
        </label>
      </BarraMes>

      {presentes.length > 0 && (
        <Filtros role="group" aria-label="Filtrar por categoría">
          {presentes.map((id) => {
            const c = porId(id);
            return (
              <Chip key={id} type="button" aria-pressed={categoriasSel.includes(id)} $marcado={categoriasSel.includes(id)} onClick={() => alternarCategoria(id)}>
                {c.texto}
              </Chip>
            );
          })}
          {hayFiltros && <BotonEnlace type="button" onClick={limpiar}>Limpiar filtros</BotonEnlace>}
        </Filtros>
      )}

      <p role="status" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {cargando ? "Cargando gastos" : `${visibles.length} de ${gastos.length} gastos`}
      </p>

      <Diseno>
        <div>
          {error && <Vacio><strong>No pudimos cargar tus gastos</strong><p>Revisa tu conexión e inténtalo de nuevo.</p></Vacio>}

          {!cargando && !error && gastos.length === 0 && (
            <Vacio>
              <Ilustracion nombre="sin-gastos" ancho="11rem" />
              <strong>No hay gastos {periodo === "mes" ? `en ${etiqueta}` : "en este período"}</strong>
              <p>{esActual ? "Registra un gasto desde Inicio." : "Prueba con otro período."}</p>
              {esActual && <BotonEnlace type="button" onClick={() => navigate("/")}>Ir a Inicio</BotonEnlace>}
            </Vacio>
          )}

          {!cargando && gastos.length > 0 && visibles.length === 0 && (
            <Vacio>
              <Ilustracion nombre="sin-resultados" ancho="9rem" />
              <strong>Nada coincide con tu búsqueda</strong>
              <p>Prueba con otras palabras o quita los filtros.</p>
              <BotonEnlace type="button" onClick={limpiar}>Limpiar filtros</BotonEnlace>
            </Vacio>
          )}

          {grupos.map((grupo, i) => {
            const titulo = vista === "dia" ? etiquetaDia(grupo.fecha, hoy) : porId(grupo.id).texto;
            const subtotal = grupo.subtotal !== undefined ? grupo.subtotal : grupo.total;
            return (
              <Grupo key={vista === "dia" ? grupo.clave : grupo.id} $indice={i} aria-label={titulo}>
                <header>
                  <h2>{titulo}</h2>
                  <span>{ConvertirAMoneda(subtotal)}</span>
                </header>
                <ul>
                  {grupo.gastos.map((g) => {
                    const c = porId(g.categoria);
                    const fecha = fromUnixTime(g.fecha);
                    return (
                      <li key={g.id}>
                        <FilaDeslizable
                          seleccionada={g.id === seleccionadoId}
                          abierta={filaAbierta === g.id}
                          alCambiarAbierta={(abre) => cambiarFilaAbierta(abre ? g.id : null)}
                          alElegir={() => elegir(g)}
                          alEditar={() => navigate(`/editar-gasto/${g.id}`)}
                          alBorrar={() => cambiarABorrar(g)}
                        >
                          <FilaGasto gasto={g} categoria={c} detalle={vista === "dia" ? `${c.texto} · ${new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(fecha)}` : formatoCorto.format(fecha)} extra={totalGastos(gastos) ? `${((g.cantidad / totalGastos(gastos)) * 100).toFixed(1).replace(".", ",")} %` : undefined} />
                          <div style={{ marginTop: "0.5rem", paddingLeft: "3.65rem" }}>
                            <BarraProgreso porcentaje={(g.cantidad / (totalGastos(gastos) || 1)) * 100} color={colorPorId(c.color).base} retraso={0.1} />
                          </div>
                        </FilaDeslizable>
                      </li>
                    );
                  })}
                </ul>
              </Grupo>
            );
          })}
        </div>

        <Panel aria-label="Detalle del gasto">
          <h2>Detalle</h2>
          {seleccionado ? (
            <DetalleGasto gasto={seleccionado} categoria={porId(seleccionado.categoria)} alBorrar={() => cambiarABorrar(seleccionado)} />
          ) : (
            <p style={{ color: theme.tintaSuave, lineHeight: 1.45 }}>Elige un gasto de la lista para ver su detalle, editarlo o borrarlo.</p>
          )}
        </Panel>
      </Diseno>

      {!esEscritorio && seleccionado && (
        <Hoja abierta={detalleAbierto} alCerrar={() => cambiarDetalleAbierto(false)} titulo="Detalle del gasto">
          <DetalleGasto gasto={seleccionado} categoria={porId(seleccionado.categoria)} alBorrar={() => cambiarABorrar(seleccionado)} />
        </Hoja>
      )}

      <Hoja abierta={rangoAbierto} alCerrar={() => cambiarRangoAbierto(false)} titulo="Elegir período" subtitulo="Toca el primer y el último día." ancho={esEscritorio ? "44rem" : "26rem"}>
        <Suspense fallback={<p role="status" style={{ textAlign: "center", padding: "2rem 0" }}>Cargando calendario…</p>}>
          <Calendario mode="range" selected={borrador || undefined} onSelect={cambiarBorrador} hasta={hoy} meses={esEscritorio ? 2 : 1} />
        </Suspense>
        <PieRango>
          <p aria-live="polite">{borrador?.from ? etiquetaRango(borrador.from, borrador.to || borrador.from, hoy) : "Elige el primer día"}</p>
          <BotonPrincipal type="button" disabled={!borrador?.from} onClick={aplicarRango}>Aplicar</BotonPrincipal>
        </PieRango>
      </Hoja>

      <ConfirmarBorrado
        abierta={Boolean(aBorrar)}
        alCerrar={() => cambiarABorrar(null)}
        alConfirmar={confirmarBorrado}
        titulo="¿Borrar este gasto?"
        mensaje="Esta acción eliminará el registro de forma permanente."
        resumen={aBorrar ? `${aBorrar.descripcion} · ${ConvertirAMoneda(aBorrar.cantidad)}` : ""}
      />
    </>
  );
};

export default PaginaLista;
