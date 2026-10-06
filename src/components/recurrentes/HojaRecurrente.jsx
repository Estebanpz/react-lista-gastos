import React, { useEffect, useRef, useState } from "react";
import Hoja from "../Hoja";
import Insignia from "../categorias/Insignia";
import { useCategorias } from "../../contexts/CategoriasContext";
import { useRecurrentes } from "../../contexts/RecurrentesContext";
import { useCliente } from "../../contexts/ClienteContext";
import { useAuth } from "../../contexts/AuthContext";
import { ranuraLibre } from "../../functions/planes";
import { crearRecurrente, actualizarRecurrente } from "../../firebase/recurrentes";
import { interpretarMonto } from "../gastos/RegistroRapido";
import { primeraFecha, fechaLegible, NOMBRES_DIA, NOMBRES_MES, DIAS_ANTES_AVISO } from "../../functions/recurrencias";
import { BotonPrincipal, Espera, MensajeError } from "../auth/elementos";
import { Formulario, Etiqueta, Grupo, Entrada, Seleccion, Ayuda, CajaMonto, Segmentos, Chips, Chip } from "./elementos";

const FRECUENCIAS = [
  { id: "mensual", texto: "Mensual" },
  { id: "quincenal", texto: "Quincenal" },
  { id: "semanal", texto: "Semanal" },
  { id: "anual", texto: "Anual" },
];
const MAX_DESCRIPCION = 60;
const MAX_MONTO = 1e12;

let contador = 0;

//Hoja para crear o editar un pago recurrente. El primer vencimiento se calcula solo a partir de hoy;
//al editar se conserva, salvo que cambie la frecuencia o el día (entonces se recalcula).
const HojaRecurrente = ({ abierta, alCerrar, recurrente }) => {
  const { categorias } = useCategorias();
  const { hoy, recurrentes } = useRecurrentes();
  const { limites } = useCliente();
  const { usuario } = useAuth();
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `recurrente-${++contador}`;
  const id = (sufijo) => `${idBase.current}-${sufijo}`;

  const [descripcion, cambiarDescripcion] = useState("");
  const [monto, cambiarMonto] = useState("");
  const [categoria, cambiarCategoria] = useState("nomina");
  const [frecuencia, cambiarFrecuencia] = useState("mensual");
  const [dia, cambiarDia] = useState(1);
  const [mes, cambiarMes] = useState(1);
  const [errores, cambiarErrores] = useState({});
  const [enviando, cambiarEnviando] = useState(false);
  const refDescripcion = useRef(null);
  const refMonto = useRef(null);

  //Al abrir: valores del pago que se edita o valores por defecto (hoy como día de pago)
  useEffect(() => {
    if (!abierta) return;
    const [, m, d] = hoy.split("-").map(Number);
    cambiarDescripcion(recurrente ? recurrente.descripcion : "");
    cambiarMonto(recurrente ? String(recurrente.cantidad).replace(".", ",") : "");
    cambiarCategoria(recurrente ? recurrente.categoria : "nomina");
    cambiarFrecuencia(recurrente ? recurrente.frecuencia : "mensual");
    cambiarDia(recurrente && recurrente.dia ? recurrente.dia : d); //quincenal guarda 0: se propone el día de hoy
    cambiarMes(recurrente && recurrente.mes ? recurrente.mes : m);
    cambiarErrores({});
    cambiarEnviando(false);
  }, [abierta, recurrente, hoy]);

  //Al cambiar de frecuencia, el «día» se ajusta a lo que significa en la nueva
  const elegirFrecuencia = (nueva) => {
    if (nueva === frecuencia) return;
    if (nueva === "semanal") cambiarDia(((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7) + 1);
    else if (frecuencia === "semanal" || frecuencia === "quincenal") cambiarDia(Number(hoy.split("-")[2]));
    cambiarFrecuencia(nueva);
  };

  const borrador = { frecuencia, dia: frecuencia === "quincenal" ? 0 : dia, mes: frecuencia === "anual" ? mes : 0 };
  const cambioCalendario = !recurrente || recurrente.frecuencia !== borrador.frecuencia || recurrente.dia !== borrador.dia || recurrente.mes !== borrador.mes;
  const proximaFecha = cambioCalendario ? primeraFecha(borrador, hoy) : recurrente.proximaFecha;

  const alCambiarMonto = (e) => {
    let limpio = e.target.value.replace(/[^\d.,]/g, "");
    const primero = limpio.search(/[.,]/);
    if (primero !== -1) limpio = limpio.slice(0, primero + 1) + limpio.slice(primero + 1).replace(/[.,]/g, "");
    cambiarMonto(limpio);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const valor = interpretarMonto(monto);
    const nuevos = {};
    if (!descripcion.trim()) nuevos.descripcion = "Escribe qué pago es (por ejemplo, «Nómina»).";
    if (!valor) nuevos.monto = "Escribe cuánto pagas.";
    else if (valor > MAX_MONTO) nuevos.monto = "El monto es demasiado grande.";
    cambiarErrores(nuevos);
    if (Object.keys(nuevos).length) {
      //Foco en el primer campo con error
      (nuevos.descripcion ? refDescripcion : refMonto).current?.focus();
      return;
    }
    cambiarEnviando(true);
    const datos = { descripcion, cantidad: valor, categoria, ...borrador, proximaFecha };
    try {
      if (recurrente) await actualizarRecurrente(recurrente.id, datos);
      else {
        //Con el cupo del plan lleno no se puede crear otro (las reglas también lo impiden)
        const ranura = recurrentes.length >= limites.pagosActivos ? null : ranuraLibre(usuario.uid, recurrentes.map((r) => r.id), limites.pagosActivos);
        if (!ranura) {
          cambiarErrores({ general: `Tu plan permite hasta ${limites.pagosActivos} pagos recurrentes. Borra uno o cambia de plan.` });
          cambiarEnviando(false);
          return;
        }
        await crearRecurrente(datos, ranura);
      }
      alCerrar(true);
    } catch (error) {
      console.log(error);
      cambiarErrores({ general: "No pudimos guardar el pago. Inténtalo de nuevo." });
      cambiarEnviando(false);
    }
  };

  return (
    <Hoja abierta={abierta} alCerrar={() => alCerrar(false)} titulo={recurrente ? "Editar pago" : "Nuevo pago recurrente"} subtitulo={`Te avisamos ${DIAS_ANTES_AVISO} días antes y el mismo día del pago.`}>
      <Formulario onSubmit={guardar} noValidate aria-busy={enviando}>
        <div>
          <Etiqueta htmlFor={id("descripcion")}>Qué pago es</Etiqueta>
          <Entrada
            id={id("descripcion")}
            ref={refDescripcion}
            name="descripcion"
            autoComplete="off"
            placeholder="Nómina, arriendo, recibo de energía…"
            maxLength={MAX_DESCRIPCION}
            value={descripcion}
            onChange={(e) => cambiarDescripcion(e.target.value)}
            $error={Boolean(errores.descripcion)}
            aria-invalid={Boolean(errores.descripcion)}
            aria-describedby={errores.descripcion ? id("error-descripcion") : undefined}
          />
          {errores.descripcion && <Ayuda $error id={id("error-descripcion")}>{errores.descripcion}</Ayuda>}
        </div>

        <div>
          <Etiqueta htmlFor={id("monto")}>Monto (COP)</Etiqueta>
          <CajaMonto $error={Boolean(errores.monto)}>
            <span aria-hidden="true">$</span>
            <input
              id={id("monto")}
              ref={refMonto}
              name="monto"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={monto}
              onChange={alCambiarMonto}
              aria-invalid={Boolean(errores.monto)}
              aria-describedby={errores.monto ? id("error-monto") : undefined}
            />
          </CajaMonto>
          {errores.monto && <Ayuda $error id={id("error-monto")}>{errores.monto}</Ayuda>}
        </div>

        <Grupo>
          <Etiqueta as="legend">Categoría</Etiqueta>
          <Chips role="radiogroup" aria-label="Categoría">
            {categorias.map((c) => (
              <Chip key={c.id} type="button" role="radio" aria-checked={categoria === c.id} $marcado={categoria === c.id} onClick={() => cambiarCategoria(c.id)}>
                <Insignia categoria={c} tam={2} sobreColor={categoria === c.id} />
                {c.texto}
              </Chip>
            ))}
          </Chips>
        </Grupo>

        <Grupo>
          <Etiqueta as="legend">Cada cuánto</Etiqueta>
          <Segmentos role="radiogroup" aria-label="Frecuencia">
            {FRECUENCIAS.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={frecuencia === f.id} onClick={() => elegirFrecuencia(f.id)}>
                {f.texto}
              </button>
            ))}
          </Segmentos>
        </Grupo>

        {frecuencia === "mensual" && (
          <div>
            <Etiqueta htmlFor={id("dia")}>Día del mes</Etiqueta>
            <Seleccion id={id("dia")} name="dia" value={dia} onChange={(e) => cambiarDia(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>Todos los {n}</option>
              ))}
            </Seleccion>
            {dia > 28 && <Ayuda>En los meses más cortos se paga el último día del mes.</Ayuda>}
          </div>
        )}

        {frecuencia === "quincenal" && <Ayuda>Se paga el día 15 y el último día de cada mes.</Ayuda>}

        {frecuencia === "semanal" && (
          <div>
            <Etiqueta htmlFor={id("dia-semana")}>Día de la semana</Etiqueta>
            <Seleccion id={id("dia-semana")} name="diaSemana" value={dia} onChange={(e) => cambiarDia(Number(e.target.value))}>
              {NOMBRES_DIA.map((n, i) => (
                <option key={n} value={i + 1}>{n}</option>
              ))}
            </Seleccion>
          </div>
        )}

        {frecuencia === "anual" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)", gap: "0.75rem" }}>
            <div>
              <Etiqueta htmlFor={id("dia-anual")}>Día</Etiqueta>
              <Seleccion id={id("dia-anual")} name="diaAnual" value={dia} onChange={(e) => cambiarDia(Number(e.target.value))}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Seleccion>
            </div>
            <div>
              <Etiqueta htmlFor={id("mes")}>Mes</Etiqueta>
              <Seleccion id={id("mes")} name="mes" value={mes} onChange={(e) => cambiarMes(Number(e.target.value))}>
                {NOMBRES_MES.map((n, i) => (
                  <option key={n} value={i + 1}>{n[0].toUpperCase() + n.slice(1)}</option>
                ))}
              </Seleccion>
            </div>
          </div>
        )}

        <Ayuda aria-live="polite">
          Próximo pago: <strong>{fechaLegible(proximaFecha, hoy)}</strong>
        </Ayuda>

        {errores.general && <MensajeError role="alert">{errores.general}</MensajeError>}

        <BotonPrincipal type="submit" disabled={enviando}>
          {enviando ? <Espera aria-hidden="true" /> : null}
          {recurrente ? "Guardar cambios" : "Guardar pago"}
        </BotonPrincipal>
      </Formulario>
    </Hoja>
  );
};

export default HojaRecurrente;
