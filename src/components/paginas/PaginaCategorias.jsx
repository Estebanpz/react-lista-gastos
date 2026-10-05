import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import useGastosRango from "../../Hooks/useGastosRango";
import { useCategorias } from "../../contexts/CategoriasContext";
import { rangoMes, rangoAnio, porCategoria, totalGastos, etiquetaMes } from "../../functions/resumen";
import { colorPorId } from "../../functions/paleta";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import { borrarCategoria } from "../../firebase/categorias";
import Dona from "../graficas/Dona";
import BarraProgreso from "../graficas/BarraProgreso";
import Insignia from "../categorias/Insignia";
import CrearCategoria from "../categorias/CrearCategoria";
import ConfirmarBorrado from "../gastos/ConfirmarBorrado";
import Ilustracion from "../Ilustracion";
import { IconoMas, IconoEditar, IconoBorrar } from "../iconos";
import { BotonEnlace } from "../auth/elementos";

const entrar = keyframes`from { opacity: 0; transform: translateY(0.6rem); } to { opacity: 1; transform: none; }`;

const Encabezado = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  h1 {
    font-size: clamp(1.6rem, 6vw, 2.1rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.25rem;
    color: ${theme.tintaSuave};
  }
`;

const Nueva = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 1.25rem;
  border: 0;
  border-radius: 999px;
  background: ${theme.colorPrimario};
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(91, 105, 226, 0.3);
  touch-action: manipulation;

  &:hover {
    background: #4c5ad6;
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 3px;
  }
`;

const Controles = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin: 1.25rem 0 0.75rem;
`;

const Segmentos = styled.div`
  display: inline-grid;
  grid-auto-flow: column;
  gap: 0.2rem;
  padding: 0.25rem;
  border: 1px solid ${theme.borde};
  border-radius: 999px;
  background: ${theme.campo};

  button {
    min-height: 2.5rem;
    padding: 0 1.1rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    color: ${theme.tintaSuave};
    cursor: pointer;
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
`;

const Tarjeta = styled.section`
  padding: 1.25rem;
  border-radius: 1.5rem;
  background: #fff;
  border: 1px solid ${theme.borde};
  box-shadow: 0 6px 20px rgba(20, 22, 31, 0.04);

  h2 {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }
`;

const Explicacion = styled(Tarjeta)`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  background: ${theme.violetaSuave};
  border-color: #d7dbfa;

  p {
    line-height: 1.45;
    color: ${theme.tinta};
  }

  strong {
    display: block;
    margin-bottom: 0.2rem;
  }

  button {
    margin-top: 0.5rem;
  }

  @media (max-width: 30rem) {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
`;

const Cuerpo = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;

  @media ${theme.dosColumnas} {
    grid-template-columns: 22rem minmax(0, 1fr);
    align-items: start;
  }
`;

const Leyenda = styled.ul`
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem 1rem;
  margin-top: 1rem;

  li {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
    min-width: 0;
  }

  i {
    flex-shrink: 0;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Ranking = styled.ol`
  list-style: none;
  display: grid;
  gap: 0.6rem;
  margin-top: 0.75rem;
`;

const Fila = styled.li`
  display: grid;
  grid-template-columns: 1.75rem auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid ${theme.borde};
  border-radius: 1.1rem;
  background: #fff;
  animation: ${entrar} 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${(p) => Math.min(p.$indice, 8) * 0.04}s;
  opacity: ${(p) => (p.$apagada ? 0.7 : 1)};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Posicion = styled.span`
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${theme.tintaSuave};
`;

const Nombre = styled.div`
  min-width: 0;

  strong {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9375rem;
    color: ${theme.tinta};
  }

  span.detalle {
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Etiquetas = styled.span`
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: ${theme.verdeSuave};
  font-size: 0.6875rem;
  font-weight: 700;
  color: ${theme.verdeTexto};
`;

const Cifras = styled.div`
  text-align: right;
  font-variant-numeric: tabular-nums;

  strong {
    display: block;
    font-size: 0.9375rem;
    color: ${theme.tinta};
  }

  span {
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
  }
`;

const Mini = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 50%;
  background: ${theme.campo};
  color: ${theme.tintaSuave};
  cursor: pointer;

  &:hover {
    color: ${theme.tinta};
    background: #e8ecf0;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const SinPropias = styled(Tarjeta)`
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  text-align: center;
  border-style: dashed;

  p {
    max-width: 24rem;
    color: ${theme.tintaSuave};
    line-height: 1.45;
  }
`;

const CLAVE_EXPLICACION = "categorias:explicacion:v1";
const leerExplicacion = () => {
  try { return window.localStorage.getItem(CLAVE_EXPLICACION) === "visto"; } catch (e) { return false; }
};

const porcentajeTexto = (n) => `${n.toFixed(1).replace(".", ",")} %`;

const PaginaCategorias = () => {
  const { categorias, porId } = useCategorias();
  const hoy = useMemo(() => new Date(), []);
  const [periodo, cambiarPeriodo] = useState("mes");
  const [filtro, cambiarFiltro] = useState("todas");
  const [explicacionVista, cambiarExplicacionVista] = useState(leerExplicacion);
  const [crearAbierta, cambiarCrearAbierta] = useState(false);
  const [editando, cambiarEditando] = useState(null);
  const [aBorrar, cambiarABorrar] = useState(null);

  const [desde, hasta] = useMemo(() => (periodo === "mes" ? rangoMes(hoy) : rangoAnio(hoy)), [periodo, hoy]);
  const { gastos, cargando } = useGastosRango(desde, hasta);

  const total = totalGastos(gastos);
  const resumen = useMemo(() => new Map(porCategoria(gastos).map((c) => [c.id, c])), [gastos]);
  const propias = categorias.filter((c) => c.propia);

  //Ranking: primero las que tienen gasto (de mayor a menor) y luego las que no tienen
  const filas = useMemo(() => {
    const lista = categorias
      .filter((c) => (filtro === "propias" ? c.propia : filtro === "nuevas" ? c.nueva : true))
      .map((c) => ({ ...c, total: resumen.get(c.id) ? resumen.get(c.id).total : 0, cuenta: resumen.get(c.id) ? resumen.get(c.id).cuenta : 0, porcentaje: resumen.get(c.id) ? resumen.get(c.id).porcentaje : 0 }));
    return lista.sort((a, b) => b.total - a.total || a.texto.localeCompare(b.texto, "es"));
  }, [categorias, resumen, filtro]);

  //Dona: las 5 mayores y «Otras»
  const segmentos = useMemo(() => {
    const ordenadas = [...resumen.values()].sort((a, b) => b.total - a.total);
    const primeras = ordenadas.slice(0, 5).map((c) => ({ id: c.id, valor: c.total, color: colorPorId(porId(c.id).color).base, texto: porId(c.id).texto }));
    const resto = ordenadas.slice(5).reduce((a, c) => a + c.total, 0);
    return resto > 0 ? [...primeras, { id: "otras", valor: resto, color: "#A8B0BD", texto: `Otras (${ordenadas.length - 5})` }] : primeras;
  }, [resumen, porId]);

  const entendido = () => {
    try { window.localStorage.setItem(CLAVE_EXPLICACION, "visto"); } catch (e) { /* sin almacenamiento: volverá a salir */ }
    cambiarExplicacionVista(true);
  };

  const abrirCrear = () => {
    cambiarEditando(null);
    cambiarCrearAbierta(true);
  };
  const abrirEditar = (c) => {
    cambiarEditando(c);
    cambiarCrearAbierta(true);
  };

  const nombrePeriodo = periodo === "mes" ? etiquetaMes(hoy) : String(hoy.getFullYear());

  return (
    <>
      <Helmet>
        <title>Categorías · Finanzas</title>
      </Helmet>

      <Encabezado>
        <div>
          <h1>Categorías</h1>
          <p>Cuánto gastas en cada una · {nombrePeriodo}</p>
        </div>
        <Nueva type="button" onClick={abrirCrear}>
          <IconoMas tam={20} /> Nueva categoría
        </Nueva>
      </Encabezado>

      <Controles>
        <Segmentos role="group" aria-label="Periodo">
          <button type="button" aria-pressed={periodo === "mes"} onClick={() => cambiarPeriodo("mes")}>Mes</button>
          <button type="button" aria-pressed={periodo === "anio"} onClick={() => cambiarPeriodo("anio")}>Año</button>
        </Segmentos>
        <Segmentos role="group" aria-label="Mostrar categorías">
          <button type="button" aria-pressed={filtro === "todas"} onClick={() => cambiarFiltro("todas")}>Todas</button>
          <button type="button" aria-pressed={filtro === "nuevas"} onClick={() => cambiarFiltro("nuevas")}>Para negocio</button>
          <button type="button" aria-pressed={filtro === "propias"} onClick={() => cambiarFiltro("propias")}>Mis categorías</button>
        </Segmentos>
      </Controles>

      {!explicacionVista && (
        <Explicacion aria-label="Cómo funcionan las categorías">
          <Ilustracion nombre="categorias" ancho="9rem" />
          <div>
            <p>
              <strong>Organiza tus gastos a tu manera</strong>
              Usa Nómina, Recibos, Créditos e Impuestos para los pagos de tu negocio, o crea tus propias categorías con el icono y el color que quieras.
            </p>
            <BotonEnlace type="button" onClick={entendido}>Entendido</BotonEnlace>
          </div>
        </Explicacion>
      )}

      <Cuerpo>
        <Tarjeta aria-labelledby="dona-titulo" aria-busy={cargando}>
          <h2 id="dona-titulo">Distribución</h2>
          <div style={{ marginTop: "1rem" }}>
            {segmentos.length ? (
              <>
                <Dona
                  segmentos={segmentos}
                  etiquetaTotal="Total"
                  textoTotal={ConvertirAMoneda(total)}
                  descripcion={`Distribución del gasto de ${nombrePeriodo}. ${segmentos.map((s) => `${s.texto}: ${porcentajeTexto((s.valor / total) * 100)}`).join(", ")}.`}
                />
                <Leyenda>
                  {segmentos.map((s) => (
                    <li key={s.id}>
                      <i style={{ background: s.color }} />
                      <span>{s.texto}</span>
                    </li>
                  ))}
                </Leyenda>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <Ilustracion nombre="sin-gastos" ancho="9rem" />
                <p style={{ marginTop: "0.75rem", color: theme.tintaSuave }}>{cargando ? "Cargando…" : `Aún no hay gastos en ${nombrePeriodo}.`}</p>
              </div>
            )}
          </div>
        </Tarjeta>

        <div>
          <Tarjeta aria-labelledby="ranking-titulo">
            <h2 id="ranking-titulo">Ranking por mayor gasto · {filas.length} {filas.length === 1 ? "categoría" : "categorías"}</h2>
            {filas.length === 0 && filtro === "propias" ? (
              <SinPropias as="div">
                <Ilustracion nombre="categoria-nueva" ancho="9rem" />
                <strong>Aún no tienes categorías propias</strong>
                <p>Crea una para agrupar gastos que no encajan en las que ya existen.</p>
                <Nueva type="button" onClick={abrirCrear}>
                  <IconoMas tam={20} /> Crear mi primera categoría
                </Nueva>
              </SinPropias>
            ) : (
              <Ranking>
                {filas.map((c, i) => (
                  <Fila key={c.id} $indice={i} $apagada={c.total === 0}>
                    <Posicion>#{i + 1}</Posicion>
                    <Insignia categoria={c} tam={2.75} />
                    <Nombre>
                      <strong>
                        {c.texto}
                        {c.nueva && <Etiquetas>Nuevo</Etiquetas>}
                        {c.propia && <Etiquetas style={{ background: theme.violetaSuave, color: "#3e4bc7" }}>Mía</Etiquetas>}
                      </strong>
                      <span className="detalle">{c.detalle || (c.cuenta ? `${c.cuenta} ${c.cuenta === 1 ? "gasto" : "gastos"}` : "Sin gastos")}</span>
                      <BarraProgreso porcentaje={c.porcentaje} color={colorPorId(c.color).base} retraso={0.1 + i * 0.03} />
                    </Nombre>
                    <Cifras>
                      <strong>{ConvertirAMoneda(c.total)}</strong>
                      <span>{porcentajeTexto(c.porcentaje)}</span>
                    </Cifras>
                    {c.propia && (
                      <div style={{ gridColumn: "2 / -1", display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <Mini type="button" aria-label={`Editar la categoría ${c.texto}`} onClick={() => abrirEditar(c)}><IconoEditar tam={16} /></Mini>
                        <Mini type="button" aria-label={`Borrar la categoría ${c.texto}`} onClick={() => cambiarABorrar(c)}><IconoBorrar tam={16} /></Mini>
                      </div>
                    )}
                  </Fila>
                ))}
              </Ranking>
            )}
          </Tarjeta>

          {propias.length === 0 && filtro !== "propias" && (
            <SinPropias>
              <Ilustracion nombre="categoria-nueva" ancho="8rem" />
              <strong>Aún no tienes categorías propias</strong>
              <p>Personaliza tus gastos con el nombre, el icono y el color que prefieras.</p>
            </SinPropias>
          )}
        </div>
      </Cuerpo>

      <CrearCategoria abierta={crearAbierta} alCerrar={() => cambiarCrearAbierta(false)} categoria={editando} />

      <ConfirmarBorrado
        abierta={Boolean(aBorrar)}
        alCerrar={() => cambiarABorrar(null)}
        alConfirmar={() => borrarCategoria(aBorrar.id)}
        titulo="¿Borrar esta categoría?"
        mensaje="Los gastos que ya registraste en ella no se borran: se mostrarán como «Sin categoría»."
        resumen={aBorrar ? aBorrar.texto : ""}
      />
    </>
  );
};

export default PaginaCategorias;
