import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { getUnixTime, fromUnixTime } from "date-fns";
import theme from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import { useCategorias } from "../../contexts/CategoriasContext";
import agregarGasto from "../../firebase/AgregarGasto";
import actualizarGasto from "../../firebase/ActualizarGasto";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import Insignia from "../categorias/Insignia";
import CrearCategoria from "../categorias/CrearCategoria";
import Ilustracion from "../Ilustracion";
import SelectorFecha from "../calendario/SelectorFecha";
import { IconoCheck, IconoNota, IconoMas } from "../iconos";
import { BotonPrincipal, Espera, MensajeError, BotonEnlace } from "../auth/elementos";

const aparecer = keyframes`from { opacity: 0; transform: translateY(0.75rem) scale(0.98); } to { opacity: 1; transform: none; }`;

const Formulario = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
`;

const Fila = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const Etiqueta = styled.label`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${theme.tintaSuave};
`;

//El campo que invita a registrar: monto grande y enfocable
const CajaMonto = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border: 2px solid ${(p) => (p.$error ? theme.rojo : theme.bordeCampo)};
  border-radius: 1.25rem;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-within {
    border-color: ${(p) => (p.$error ? theme.rojo : theme.colorPrimario)};
    box-shadow: 0 0 0 4px ${(p) => (p.$error ? "rgba(227,71,71,.18)" : "rgba(91,105,226,.2)")};
  }

  span {
    font-size: 2rem;
    font-weight: 800;
    color: ${theme.tintaSuave};
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: clamp(2.25rem, 9vw, 3.25rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: ${theme.tinta};
    caret-color: ${theme.colorPrimario};
  }

  input::placeholder {
    color: #b9c0cc;
    opacity: 1;
  }
`;

const Ayuda = styled.p`
  margin-top: 0.4rem;
  padding-left: 0.4rem;
  font-size: 0.8125rem;
  color: ${(p) => (p.$error ? "#B42323" : theme.tintaSuave)};
  font-variant-numeric: tabular-nums;
`;

const Chips = styled.div`
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0.25rem 0.5rem;
  margin: 0 -0.25rem;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
`;

const Chip = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1rem 0 0.5rem;
  border: 2px solid ${(p) => (p.$marcado ? "#3e4bc7" : theme.borde)}; /* seleccionado: 6,3:1 con texto blanco (AA) */
  border-radius: 999px;
  background: ${(p) => (p.$marcado ? "#3e4bc7" : "#fff")};
  color: ${(p) => (p.$marcado ? "#fff" : theme.tinta)};
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  scroll-snap-align: start;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const CampoNota = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0 1.1rem;
  border: 1px solid ${(p) => (p.$error ? theme.rojo : theme.bordeCampo)};
  border-radius: 999px;
  background: ${theme.campo};
  color: ${theme.tintaSuave};

  &:focus-within {
    background: #fff;
    border-color: ${(p) => (p.$error ? theme.rojo : theme.colorPrimario)};
    box-shadow: 0 0 0 3px rgba(91, 105, 226, 0.22);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 3.1rem;
    border: 0;
    outline: 0;
    background: transparent;
    font: inherit;
    font-size: ${theme.letraCampo};
    color: ${theme.tinta};
    caret-color: ${theme.colorPrimario};
  }

  input::placeholder {
    color: ${theme.placeholder};
    opacity: 1;
  }
`;

const Confirmacion = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  text-align: center;
  animation: ${aparecer} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;

  h3 {
    font-size: 1.35rem;
    font-weight: 800;
    color: ${theme.tinta};
  }

  p {
    max-width: 22rem;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: ${theme.tintaSuave};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Botones = styled.div`
  display: grid;
  gap: 0.6rem;
  width: 100%;
  max-width: 22rem;
  margin-top: 0.5rem;
`;

const EnlaceComoBoton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.25rem;
  border-radius: 999px;
  background: ${theme.campo};
  font-weight: 600;
  color: ${theme.tinta};
  text-decoration: none;

  &:hover {
    background: #e8ecf0;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

//Texto del monto → número. Acepta «1500», «1500,50» o «1500.50».
export const interpretarMonto = (texto) => {
  const limpio = String(texto).replace(/\s/g, "").replace(",", ".");
  if (!/^\d*\.?\d*$/.test(limpio) || limpio === "" || limpio === ".") return 0;
  return Number(limpio);
};

const aClaveFecha = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

//Registro de un gasto (o edición si llega `gasto`). Pensado para hacerse en pocos toques:
//monto grande, categoría con un toque, descripción corta y «Guardar».
//`alTerminar` se llama cuando la persona cierra la confirmación (p. ej. para cerrar la hoja en móvil).
const RegistroRapido = ({ gasto, alTerminar, idPrefijo = "registro" }) => {
  const { usuario } = useAuth();
  const { categorias } = useCategorias();
  const navigate = useNavigate();
  const editando = Boolean(gasto);

  const [monto, cambiarMonto] = useState(gasto ? String(gasto.cantidad).replace(".", ",") : "");
  const [categoria, cambiarCategoria] = useState(gasto ? gasto.categoria : "comida");
  const [descripcion, cambiarDescripcion] = useState(gasto ? gasto.descripcion : "");
  const [fecha, cambiarFecha] = useState(aClaveFecha(gasto ? fromUnixTime(gasto.fecha) : new Date()));
  const [errores, cambiarErrores] = useState({});
  const [enviando, cambiarEnviando] = useState(false);
  const [resultado, cambiarResultado] = useState(null);
  const [crearAbierta, cambiarCrearAbierta] = useState(false);
  const [enfocarMonto, cambiarEnfocarMonto] = useState(false);
  const refMonto = useRef(null);
  const refDescripcion = useRef(null);

  //Si la categoría elegida desaparece (se borró), se vuelve a una por defecto
  useEffect(() => {
    if (!categorias.some((c) => c.id === categoria)) cambiarCategoria("comida");
  }, [categorias, categoria]);

  const valor = interpretarMonto(monto);
  const hoy = aClaveFecha(new Date());

  const alCambiarMonto = (e) => {
    //Solo dígitos y un separador decimal
    let limpio = e.target.value.replace(/[^\d.,]/g, "");
    const primero = limpio.search(/[.,]/);
    //Manda el primer separador; los demás se descartan
    if (primero >= 0) limpio = limpio.slice(0, primero + 1) + limpio.slice(primero + 1).replace(/[.,]/g, "");
    cambiarMonto(limpio);
    cambiarErrores((x) => ({ ...x, monto: undefined }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const nuevos = {};
    if (!(valor > 0)) nuevos.monto = "Escribe cuánto gastaste.";
    if (!descripcion.trim()) nuevos.descripcion = "Cuéntanos en qué gastaste.";
    if (Object.keys(nuevos).length) {
      cambiarErrores(nuevos);
      (nuevos.monto ? refMonto : refDescripcion).current.focus();
      return;
    }

    //Fecha de hoy → ahora mismo; otro día → mediodía de ese día (evita saltos por zona horaria)
    const [a, m, d] = fecha.split("-").map(Number);
    const instante = fecha === hoy ? new Date() : new Date(a, m - 1, d, 12, 0, 0);
    const segundos = getUnixTime(instante);

    cambiarErrores({});
    cambiarEnviando(true);
    try {
      const estado = editando
        ? await actualizarGasto(gasto.id, descripcion.trim(), valor, categoria, segundos)
        : await agregarGasto(descripcion.trim(), valor, categoria, segundos, usuario.uid);
      cambiarResultado({ estado, valor, categoria });
    } catch (error) {
      console.log(error);
      cambiarEnviando(false);
      cambiarErrores({ general: "No se pudo guardar el gasto. Inténtalo de nuevo." });
    }
  };

  const registrarOtro = () => {
    cambiarMonto("");
    cambiarDescripcion("");
    cambiarFecha(aClaveFecha(new Date()));
    cambiarResultado(null);
    cambiarEnviando(false);
    cambiarEnfocarMonto(true); //el foco se pasa en el efecto de abajo, justo después de pintar el formulario
  };

  useEffect(() => {
    if (enfocarMonto && !resultado && refMonto.current) {
      refMonto.current.focus();
      cambiarEnfocarMonto(false);
    }
  }, [enfocarMonto, resultado]);

  if (resultado) {
    const cat = categorias.find((c) => c.id === resultado.categoria);
    return (
      <Confirmacion role="status">
        <Ilustracion nombre="guardado" ancho="12rem" />
        <h3>{editando ? "Cambios guardados" : "¡Gasto guardado!"}</h3>
        <p>
          {ConvertirAMoneda(resultado.valor)}
          {cat ? ` en ${cat.texto}` : ""}.{" "}
          {resultado.estado === "en-cola" && "Lo guardamos en tu dispositivo y se sincronizará cuando vuelvas a tener conexión."}
        </p>
        <Botones>
          {editando ? (
            <BotonPrincipal type="button" onClick={() => (alTerminar ? alTerminar() : navigate("/lista"))}>Volver a la lista</BotonPrincipal>
          ) : (
            <>
              <BotonPrincipal type="button" onClick={registrarOtro}>Registrar otro gasto</BotonPrincipal>
              <EnlaceComoBoton to="/lista" onClick={alTerminar}>Ver mi lista</EnlaceComoBoton>
            </>
          )}
        </Botones>
      </Confirmacion>
    );
  }

  return (
    <>
      <Formulario onSubmit={guardar} noValidate aria-busy={enviando}>
        <Fila>
          <Etiqueta htmlFor={`${idPrefijo}-monto`}>Valor del gasto (COP)</Etiqueta>
          <SelectorFecha valor={fecha} alCambiar={cambiarFecha} />
        </Fila>

        <div>
          <CajaMonto $error={Boolean(errores.monto)}>
            <span aria-hidden="true">$</span>
            <input
              id={`${idPrefijo}-monto`}
              name="monto"
              ref={refMonto}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={monto}
              onChange={alCambiarMonto}
              aria-invalid={errores.monto ? "true" : undefined}
              aria-describedby={`${idPrefijo}-monto-ayuda`}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); refDescripcion.current.focus(); } }}
            />
          </CajaMonto>
          <Ayuda id={`${idPrefijo}-monto-ayuda`} $error={Boolean(errores.monto)} role={errores.monto ? "alert" : undefined}>
            {errores.monto || (valor > 0 ? ConvertirAMoneda(valor) : "Escribe el valor con el teclado numérico.")}
          </Ayuda>
        </div>

        <div>
          <Fila style={{ marginBottom: "0.35rem" }}>
            <Etiqueta as="span" id={`${idPrefijo}-cat`}>Categoría</Etiqueta>
          </Fila>
          <Chips role="radiogroup" aria-labelledby={`${idPrefijo}-cat`}>
            {categorias.map((c) => (
              <Chip key={c.id} type="button" role="radio" aria-checked={categoria === c.id} $marcado={categoria === c.id} onClick={() => cambiarCategoria(c.id)}>
                <Insignia categoria={c} tam={2} sobreColor={categoria === c.id} />
                {c.texto}
              </Chip>
            ))}
            <Chip type="button" onClick={() => cambiarCrearAbierta(true)} aria-label="Crear una categoría nueva">
              <Insignia categoria={{ icono: "formas", color: "indigo" }} tam={2} />
              <IconoMas tam={16} /> Nueva
            </Chip>
          </Chips>
        </div>

        <div>
          <Etiqueta htmlFor={`${idPrefijo}-descripcion`}>Detalle</Etiqueta>
          <CampoNota $error={Boolean(errores.descripcion)} style={{ marginTop: "0.4rem" }}>
            <IconoNota tam={18} />
            <input
              id={`${idPrefijo}-descripcion`}
              name="descripcion"
              ref={refDescripcion}
              autoComplete="off"
              maxLength={200}
              placeholder="¿En qué gastaste?…"
              value={descripcion}
              onChange={(e) => { cambiarDescripcion(e.target.value); cambiarErrores((x) => ({ ...x, descripcion: undefined })); }}
              aria-invalid={errores.descripcion ? "true" : undefined}
              aria-describedby={errores.descripcion ? `${idPrefijo}-descripcion-error` : undefined}
            />
          </CampoNota>
          {errores.descripcion && <Ayuda id={`${idPrefijo}-descripcion-error`} $error role="alert">{errores.descripcion}</Ayuda>}
        </div>

        {errores.general && <MensajeError role="alert">{errores.general}</MensajeError>}

        <BotonPrincipal type="submit" aria-busy={enviando}>
          {enviando ? <><Espera aria-hidden="true" /> Guardando…</> : <><IconoCheck tam={20} /> {editando ? "Guardar cambios" : "Guardar gasto"}</>}
        </BotonPrincipal>
        {editando && <BotonEnlace type="button" onClick={() => (alTerminar ? alTerminar() : navigate("/lista"))}>Cancelar</BotonEnlace>}
      </Formulario>

      <CrearCategoria abierta={crearAbierta} alCerrar={() => cambiarCrearAbierta(false)} alGuardar={(nueva) => cambiarCategoria(nueva.id)} />
    </>
  );
};

export default RegistroRapido;
