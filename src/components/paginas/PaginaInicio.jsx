import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import styled, { keyframes } from "styled-components";
import { fromUnixTime } from "date-fns";
import theme from "../../theme";
import useGastosRango from "../../Hooks/useGastosRango";
import useMediaQuery from "../../Hooks/useMediaQuery";
import { useCategorias } from "../../contexts/CategoriasContext";
import { rangoMes, totalGastos, acumuladoPorDia, porCategoria, etiquetaMes, claveFecha } from "../../functions/resumen";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import GraficaLinea from "../graficas/GraficaLinea";
import RegistroRapido from "../gastos/RegistroRapido";
import FilaGasto from "../gastos/FilaGasto";
import Insignia from "../categorias/Insignia";
import Hoja from "../Hoja";
import Ilustracion from "../Ilustracion";
import BannerInstalar from "../BannerInstalar";
import { IconoMas, IconoDerecha } from "../iconos";

const subir = keyframes`from { opacity: 0; transform: translateY(0.75rem); } to { opacity: 1; transform: none; }`;

const Cuadricula = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* sin esto una fila con scroll horizontal ensancha la columna */
  gap: 1rem;
  margin-top: 1.25rem;

  @media (min-width: 60rem) {
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
  }
`;

const Columna = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  min-width: 0;
`;

const Tarjeta = styled.section`
  padding: 1.25rem;
  border-radius: 1.5rem;
  background: #fff;
  border: 1px solid ${theme.borde};
  box-shadow: 0 6px 20px rgba(20, 22, 31, 0.04);
  animation: ${subir} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: ${(p) => p.$retraso || 0}s;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  h2 {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }
`;

const Titulo = styled.h1`
  font-size: clamp(1.6rem, 6vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  text-wrap: balance;
  color: ${theme.tinta};

  & + p {
    margin-top: 0.35rem;
    color: ${theme.tintaSuave};
  }
`;

const Cifra = styled.p`
  margin-top: 0.4rem;
  font-size: clamp(1.9rem, 7vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: ${theme.tinta};

  small {
    margin-left: 0.4rem;
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0;
    color: #3e4bc7;
  }
`;

const Etiqueta = styled.span`
  display: inline-block;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: ${theme.campo};
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${theme.tintaSuave};
`;

const Mini = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (min-width: 60rem) {
    grid-template-columns: 1fr;
  }

  p {
    margin-top: 0.4rem;
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
  }

  span {
    display: block;
    margin-top: 0.1rem;
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
  }
`;

const Cabecera = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

const Lista = styled.ul`
  list-style: none;
  margin-top: 0.75rem;

  li + li {
    border-top: 1px solid ${theme.borde};
  }

  li {
    padding: 0.85rem 0;
  }
`;

const VerTodos = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 2.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #3e4bc7;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
    border-radius: 0.5rem;
  }
`;

const Vacio = styled.div`
  padding: 1rem 0 0.5rem;
  text-align: center;

  p {
    margin: 0.75rem auto 0;
    max-width: 22rem;
    color: ${theme.tintaSuave};
    line-height: 1.45;
  }

  strong {
    display: block;
    margin-top: 0.75rem;
    font-size: 1.1rem;
    color: ${theme.tinta};
  }
`;

const Flotante = styled.button`
  position: fixed;
  right: 1.25rem;
  bottom: calc(5.75rem + env(safe-area-inset-bottom));
  z-index: 40; /* debajo de la barra de navegación (60) y de las hojas (2000) */
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 3.5rem;
  padding: 0 1.4rem;
  border: 0;
  border-radius: 999px;
  background: ${theme.colorPrimario};
  color: #fff;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(91, 105, 226, 0.4);
  touch-action: manipulation;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Esqueleto = styled.div`
  height: ${(p) => p.$alto || "8rem"};
  border-radius: 1.5rem;
  background: linear-gradient(90deg, #eef0f3 25%, #f6f7f9 50%, #eef0f3 75%);
  background-size: 200% 100%;
  animation: ${keyframes`to { background-position: -200% 0; }`} 1.4s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const PaginaInicio = () => {
  const { porId } = useCategorias();
  const hoy = useMemo(() => new Date(), []);
  const [desde, hasta] = useMemo(() => rangoMes(hoy), [hoy]);
  const { gastos, cargando } = useGastosRango(desde, hasta);
  const esEscritorio = useMediaQuery("(min-width: 60rem)");
  const [hojaAbierta, cambiarHojaAbierta] = useState(false);
  const [dia, cambiarDia] = useState(null);

  const total = useMemo(() => totalGastos(gastos), [gastos]);
  const datos = useMemo(() => acumuladoPorDia(gastos, hoy, hoy), [gastos, hoy]);
  const claveHoy = claveFecha(hoy);
  const deHoy = useMemo(() => gastos.filter((g) => claveFecha(fromUnixTime(g.fecha)) === claveHoy), [gastos, claveHoy]);
  const mayor = useMemo(() => porCategoria(gastos)[0], [gastos]);
  const ultimos = gastos.slice(0, 3);
  const nombreMes = etiquetaMes(hoy);
  const seleccionado = dia === null ? datos.length - 1 : dia;

  return (
    <>
      <Helmet>
        <title>Inicio · Finanzas</title>
      </Helmet>

      <Titulo>Hola, así van tus gastos</Titulo>
      <p>Control de gastos personales y de tu negocio.</p>
      <BannerInstalar />

      <Cuadricula>
        <Columna>
          {esEscritorio && (
            <Tarjeta aria-labelledby="registro-titulo">
              <h2 id="registro-titulo">Registro rápido</h2>
              <div style={{ marginTop: "1rem" }}>
                <RegistroRapido idPrefijo="inicio" />
              </div>
            </Tarjeta>
          )}

          <Tarjeta aria-labelledby="total-titulo" aria-busy={cargando} $retraso={0.05}>
            {cargando ? (
              <Esqueleto $alto="14rem" />
            ) : (
              <>
                <Cabecera>
                  <div>
                    <h2 id="total-titulo">Total gastado en el mes</h2>
                    <Cifra>
                      {ConvertirAMoneda(total)} <small>COP</small>
                    </Cifra>
                  </div>
                  <Etiqueta>{nombreMes}</Etiqueta>
                </Cabecera>
                {gastos.length ? (
                  <div style={{ marginTop: "2.25rem" }}>
                    <GraficaLinea datos={datos} seleccionado={seleccionado} alSeleccionar={cambiarDia} etiquetaMes={nombreMes} />
                  </div>
                ) : (
                  <Vacio>
                    <Ilustracion nombre="sin-gastos" ancho="10rem" />
                    <strong>Aún no hay gastos este mes</strong>
                    <p>Registra el primero y verás aquí tu total, la gráfica y tus categorías.</p>
                  </Vacio>
                )}
              </>
            )}
          </Tarjeta>
        </Columna>

        <Columna>
          <Mini>
            <Tarjeta $retraso={0.1}>
              <h2>Gasto de hoy</h2>
              <p>{ConvertirAMoneda(totalGastos(deHoy))}</p>
              <span>{deHoy.length === 1 ? "1 registro" : `${deHoy.length} registros`}</span>
            </Tarjeta>
            <Tarjeta $retraso={0.15}>
              <h2>Mayor categoría</h2>
              {mayor ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginTop: "0.4rem" }}>
                  <Insignia categoria={porId(mayor.id)} tam={2.5} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis" }}>{porId(mayor.id).texto}</p>
                    <span>{ConvertirAMoneda(mayor.total)}</span>
                  </div>
                </div>
              ) : (
                <>
                  <p>—</p>
                  <span>Aún sin gastos</span>
                </>
              )}
            </Tarjeta>
          </Mini>

          <Tarjeta aria-labelledby="ultimos-titulo" $retraso={0.2}>
            <Cabecera>
              <h2 id="ultimos-titulo">Últimos gastos</h2>
              <VerTodos to="/lista">
                Ver todos <IconoDerecha tam={16} />
              </VerTodos>
            </Cabecera>
            {ultimos.length ? (
              <Lista>
                {ultimos.map((g) => {
                  const c = porId(g.categoria);
                  return (
                    <li key={g.id}>
                      <FilaGasto gasto={g} categoria={c} detalle={`${c.texto} · ${new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(fromUnixTime(g.fecha))}`} />
                    </li>
                  );
                })}
              </Lista>
            ) : (
              !cargando && <Vacio><p>Cuando registres gastos, los últimos aparecerán aquí.</p></Vacio>
            )}
          </Tarjeta>
        </Columna>
      </Cuadricula>

      {!esEscritorio && (
        <>
          <Flotante type="button" onClick={() => cambiarHojaAbierta(true)}>
            <IconoMas tam={22} /> Agregar gasto
          </Flotante>
          <Hoja abierta={hojaAbierta} alCerrar={() => cambiarHojaAbierta(false)} titulo="Nuevo gasto" subtitulo="Regístralo en segundos">
            <RegistroRapido idPrefijo="hoja" alTerminar={() => cambiarHojaAbierta(false)} />
          </Hoja>
        </>
      )}
    </>
  );
};

export default PaginaInicio;
