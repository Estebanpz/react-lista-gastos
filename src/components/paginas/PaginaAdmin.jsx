import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import theme from "../../theme";
import { useCliente } from "../../contexts/ClienteContext";
import { useClientesAdmin } from "../../Hooks/useClientesAdmin";
import useMediaQuery from "../../Hooks/useMediaQuery";
import { estadoCliente, PLANES } from "../../functions/planes";
import Ilustracion from "../Ilustracion";
import { BotonPrincipal, MensajeError } from "../auth/elementos";
import { IconoMas, IconoBuscar, IconoDerecha } from "../iconos";
import { Entrada } from "../recurrentes/elementos";
import { PastillaEstado, TONOS, Medidor, fechaCorta } from "../admin/elementos";
import HojaCliente from "../admin/HojaCliente";
import HojaPlanCliente from "../admin/HojaPlanCliente";
import HojaPagoPlan from "../admin/HojaPagoPlan";

const entrar = keyframes`from { opacity: 0; transform: translateY(0.5rem); } to { opacity: 1; transform: none; }`;

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
  width: auto;
  padding: 0 1.4rem;
  gap: 0.4rem;
`;

//Conteos por estado: cada uno filtra la lista (y vuelve a tocarse para quitar el filtro)
const Resumen = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1.5rem;

  @media (min-width: 40rem) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Contador = styled.button`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.9rem 1rem;
  border: 2px solid ${(p) => (p.$marcado ? TONOS[p.$tono].texto : "transparent")};
  border-radius: 1.1rem;
  background: ${(p) => TONOS[p.$tono].fondo};
  color: ${(p) => TONOS[p.$tono].texto};
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  animation: ${entrar} 0.45s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: ${(p) => p.$i * 60}ms;

  strong {
    font-size: 1.75rem;
    line-height: 1;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  span {
    font-size: 0.875rem;
    font-weight: 700;
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Buscador = styled.div`
  position: relative;
  margin-top: 1.25rem;

  svg {
    position: absolute;
    left: 1.1rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${theme.placeholder};
    pointer-events: none;
  }

  input {
    padding-left: 3rem;
  }
`;

const Tabla = styled.table`
  width: 100%;
  margin-top: 1rem;
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border: 1px solid ${theme.borde};
  border-radius: 1.25rem;
  overflow: hidden;

  th {
    padding: 0.8rem 1rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
    background: ${theme.campo};
  }

  td {
    padding: 0.85rem 1rem;
    border-top: 1px solid ${theme.borde};
    vertical-align: middle;
  }

  td small {
    display: block;
    color: ${theme.tintaSuave};
  }

  tbody tr {
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  tbody tr:hover {
    background: ${theme.campo};
  }

  button.fila {
    display: block;
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-weight: 700;
    color: ${theme.tinta};
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  button.fila:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 3px;
    border-radius: 0.25rem;
  }

  @media (prefers-reduced-motion: reduce) {
    tbody tr {
      transition: none;
    }
  }
`;

const Grupo = styled.section`
  margin-top: 1.5rem;

  h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${theme.tintaSuave};
  }

  ul {
    display: grid;
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
`;

const Tarjeta = styled.button`
  display: grid;
  gap: 0.7rem;
  width: 100%;
  padding: 1rem 1.1rem;
  border: 1px solid ${theme.borde};
  border-left: 5px solid ${(p) => TONOS[p.$tono].texto};
  border-radius: 1.1rem;
  background: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  animation: ${entrar} 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  strong {
    display: block;
    color: ${theme.tinta};
    overflow-wrap: anywhere;
  }

  small {
    color: ${theme.tintaSuave};
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Vacio = styled.div`
  margin-top: 2rem;
  padding: 2rem 1rem;
  text-align: center;
  color: ${theme.tintaSuave};

  p {
    margin-top: 1rem;
  }
`;

//Orden y rótulos de los grupos de la vista móvil «Por estado»
const GRUPOS = [
  ["vencido", "Vencidos"],
  ["por-vencer", "Por vencer"],
  ["suspendido", "Suspendidos"],
  ["sin-plan", "Sin plan"],
  ["activo", "Activos"],
  ["prueba", "En prueba"],
];

const PaginaAdmin = () => {
  const { cargando, esAdmin } = useCliente();
  const ancha = useMediaQuery(theme.pantallaAncha);
  const { clientes, usos, error } = useClientesAdmin(esAdmin);
  const [ahora, cambiarAhora] = useState(() => Date.now());
  const [filtro, cambiarFiltro] = useState(null);
  const [texto, cambiarTexto] = useState("");
  const [abierto, cambiarAbierto] = useState(null); //uid del detalle
  const [editando, cambiarEditando] = useState(undefined); //undefined = cerrada, null = alta, objeto = edición
  const [pagando, cambiarPagando] = useState(null);

  useEffect(() => {
    const reloj = window.setInterval(() => cambiarAhora(Date.now()), 60000);
    return () => window.clearInterval(reloj);
  }, []);

  const filas = useMemo(
    () =>
      (clientes || [])
        .map((c) => ({ ...c, _estado: estadoCliente(c, ahora) }))
        .sort((a, b) => a.vence.toMillis() - b.vence.toMillis()),
    [clientes, ahora]
  );
  const conteo = useMemo(() => {
    const n = { activo: 0, "por-vencer": 0, vencido: 0, suspendido: 0, prueba: 0 };
    filas.forEach((f) => {
      if (n[f._estado] !== undefined) n[f._estado] += 1;
    });
    return n;
  }, [filas]);

  if (!cargando && !esAdmin) return <Navigate to="/" replace />;

  const busqueda = texto.trim().toLowerCase();
  const visibles = filas.filter((f) => (!filtro || f._estado === filtro) && (!busqueda || `${f.correo} ${f.nombre || ""}`.toLowerCase().includes(busqueda)));
  const detalle = filas.find((f) => f.uid === abierto) || null;
  const ingresos = filas.filter((f) => f._estado === "activo" || f._estado === "por-vencer").reduce((s, f) => s + PLANES[f.plan].precio, 0);

  const CONTADORES = [
    ["activo", "Activos"],
    ["por-vencer", "Por vencer"],
    ["vencido", "Vencidos"],
    ["suspendido", "Suspendidos"],
  ];

  return (
    <>
      <Cabecera>
        <div>
          <h1>Clientes</h1>
          <p>
            {filas.length} {filas.length === 1 ? "cliente" : "clientes"}
            {ingresos ? ` · ${ingresos.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })} al mes con plan vigente` : ""}
          </p>
        </div>
        <BotonNuevo type="button" onClick={() => cambiarEditando(null)}>
          <IconoMas tam={20} /> Nuevo cliente
        </BotonNuevo>
      </Cabecera>

      <Resumen role="group" aria-label="Filtrar por estado">
        {CONTADORES.map(([estado, rotulo], i) => (
          <Contador key={estado} type="button" $tono={estado} $i={i} $marcado={filtro === estado} aria-pressed={filtro === estado} onClick={() => cambiarFiltro(filtro === estado ? null : estado)}>
            <strong>{conteo[estado]}</strong>
            <span>{rotulo}</span>
          </Contador>
        ))}
      </Resumen>

      <Buscador>
        <IconoBuscar tam={20} />
        <Entrada type="search" name="buscar" aria-label="Buscar cliente por correo o nombre" placeholder="Buscar por correo o nombre" autoComplete="off" value={texto} onChange={(e) => cambiarTexto(e.target.value)} />
      </Buscador>

      {error && <MensajeError role="alert" style={{ marginTop: "1rem" }}>No pudimos leer los clientes. ¿Tu cuenta está registrada como super admin?</MensajeError>}
      {clientes === null && !error && <p role="status" style={{ marginTop: "1.5rem", color: theme.tintaSuave }}>Cargando clientes…</p>}

      {clientes !== null && visibles.length === 0 && (
        <Vacio>
          <Ilustracion nombre={filas.length ? "sin-resultados" : "sin-gastos"} />
          <p>{filas.length ? "Ningún cliente coincide con el filtro." : "Aún no hay clientes. Crea la cuenta en Firebase Console y asígnale un plan."}</p>
        </Vacio>
      )}

      {visibles.length > 0 && ancha && (
        <Tabla>
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              <th scope="col">Plan</th>
              <th scope="col">Estado</th>
              <th scope="col">Vence</th>
              <th scope="col" style={{ width: "16rem" }}>Gastos del mes</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.uid} onClick={() => cambiarAbierto(f.uid)}>
                <td>
                  <button type="button" className="fila" onClick={(e) => { e.stopPropagation(); cambiarAbierto(f.uid); }}>
                    {f.nombre || f.correo}
                  </button>
                  {f.nombre && <small>{f.correo}</small>}
                </td>
                <td>{PLANES[f.plan].nombre}</td>
                <td><PastillaEstado cliente={f} ahora={ahora} /></td>
                <td>{fechaCorta(f.vence)}</td>
                <td><Medidor etiqueta={`Gastos de ${f.nombre || f.correo}`} usado={usos[f.uid] || 0} limite={f.limites.gastosMes} /></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {visibles.length > 0 && !ancha &&
        GRUPOS.map(([estado, rotulo]) => {
          const grupo = visibles.filter((f) => f._estado === estado);
          if (!grupo.length) return null;
          return (
            <Grupo key={estado} aria-label={rotulo}>
              <h2>
                {rotulo} <span aria-hidden="true">· {grupo.length}</span>
              </h2>
              <ul>
                {grupo.map((f, i) => (
                  <li key={f.uid}>
                    <Tarjeta type="button" $tono={estado} style={{ animationDelay: `${i * 40}ms` }} onClick={() => cambiarAbierto(f.uid)}>
                      <header>
                        <span style={{ minWidth: 0 }}>
                          <strong>{f.nombre || f.correo}</strong>
                          <small>{PLANES[f.plan].nombre} · vence {fechaCorta(f.vence)}</small>
                        </span>
                        <IconoDerecha tam={18} />
                      </header>
                      <PastillaEstado cliente={f} ahora={ahora} />
                      <Medidor etiqueta="Gastos del mes" usado={usos[f.uid] || 0} limite={f.limites.gastosMes} />
                    </Tarjeta>
                  </li>
                ))}
              </ul>
            </Grupo>
          );
        })}

      <HojaCliente
        cliente={detalle}
        uso={detalle ? usos[detalle.uid] || 0 : 0}
        ahora={ahora}
        alCerrar={() => cambiarAbierto(null)}
        alPagar={(c) => cambiarPagando(c)}
        alEditar={(c) => cambiarEditando(c)}
      />
      <HojaPlanCliente abierta={editando !== undefined} cliente={editando || null} alCerrar={() => cambiarEditando(undefined)} />
      <HojaPagoPlan cliente={pagando} alCerrar={() => cambiarPagando(null)} />
    </>
  );
};

export default PaginaAdmin;
