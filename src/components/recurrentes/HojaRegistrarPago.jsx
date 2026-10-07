import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Hoja from "../Hoja";
import Insignia from "../categorias/Insignia";
import SelectorFecha from "../calendario/SelectorFecha";
import { useCategorias } from "../../contexts/CategoriasContext";
import { useRecurrentes } from "../../contexts/RecurrentesContext";
import { registrarPago, omitirPago } from "../../firebase/recurrentes";
import { interpretarMonto } from "../gastos/RegistroRapido";
import { describirFrecuencia, etiquetaVencimiento, fechaLegible, siguienteFecha } from "../../functions/recurrencias";
import { BotonPrincipal, Espera, MensajeError } from "../auth/elementos";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import { Formulario, Etiqueta, Ayuda, CajaMonto, VistaMonto, BotonSecundario } from "./elementos";

const Resumen = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: ${theme.campo};

  strong {
    display: block;
    font-size: 1rem;
    color: ${theme.tinta};
    overflow-wrap: anywhere;
  }

  span {
    font-size: 0.875rem;
    color: ${theme.tintaSuave};
  }
`;

const Acciones = styled.div`
  display: grid;
  gap: 0.6rem;
`;

const aClave = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

let contador = 0;

//Confirma un pago recurrente: crea el gasto (monto y fecha editables) y pasa al siguiente vencimiento.
//«Omitir esta vez» avanza sin crear gasto. `alCerrar(resultado)` recibe "pagado" | "omitido" | null.
const HojaRegistrarPago = ({ recurrente, alCerrar }) => {
  const { porId } = useCategorias();
  const { hoy } = useRecurrentes();
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `pago-${++contador}`;

  const [monto, cambiarMonto] = useState("");
  const [fecha, cambiarFecha] = useState(aClave(new Date()));
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  useEffect(() => {
    if (!recurrente) return;
    cambiarMonto(String(recurrente.cantidad).replace(".", ","));
    cambiarFecha(aClave(new Date()));
    cambiarError("");
    cambiarEnviando(false);
  }, [recurrente]);

  if (!recurrente) return null;
  const categoria = porId(recurrente.categoria);
  const siguiente = siguienteFecha(recurrente, recurrente.proximaFecha);

  const alCambiarMonto = (e) => {
    let limpio = e.target.value.replace(/[^\d.,]/g, "");
    const primero = limpio.search(/[.,]/);
    if (primero !== -1) limpio = limpio.slice(0, primero + 1) + limpio.slice(primero + 1).replace(/[.,]/g, "");
    cambiarMonto(limpio);
  };

  const pagar = async (e) => {
    e.preventDefault();
    const valor = interpretarMonto(monto);
    if (!valor) {
      cambiarError("Escribe cuánto pagaste.");
      return;
    }
    cambiarEnviando(true);
    //Hoy → ahora mismo; otro día → mediodía de ese día (evita saltos por zona horaria), como en el registro rápido
    const [a, m, d] = fecha.split("-").map(Number);
    const instante = fecha === aClave(new Date()) ? new Date() : new Date(a, m - 1, d, 12, 0, 0);
    try {
      await registrarPago(recurrente, { cantidad: valor, fecha: instante });
      alCerrar("pagado");
    } catch (err) {
      console.log(err);
      cambiarError("No pudimos registrar el pago. Inténtalo de nuevo.");
      cambiarEnviando(false);
    }
  };

  const omitir = async () => {
    cambiarEnviando(true);
    try {
      await omitirPago(recurrente);
      alCerrar("omitido");
    } catch (err) {
      console.log(err);
      cambiarError("No pudimos omitir este pago. Inténtalo de nuevo.");
      cambiarEnviando(false);
    }
  };

  return (
    <Hoja abierta alCerrar={() => alCerrar(null)} titulo="Registrar pago" subtitulo="Se guarda como gasto y pasa al siguiente vencimiento.">
      <Formulario onSubmit={pagar} noValidate aria-busy={enviando}>
        <Resumen>
          <Insignia categoria={categoria} tam={2.75} />
          <div style={{ minWidth: 0 }}>
            <strong>{recurrente.descripcion}</strong>
            <span>
              {describirFrecuencia(recurrente)} · {etiquetaVencimiento(recurrente, hoy)}
            </span>
          </div>
        </Resumen>

        <div>
          <Etiqueta htmlFor={`${idBase.current}-monto`}>Monto pagado (COP)</Etiqueta>
          <CajaMonto $error={Boolean(error)}>
            <span aria-hidden="true">$</span>
            <input
              id={`${idBase.current}-monto`}
              name="monto"
              inputMode="decimal"
              autoComplete="off"
              value={monto}
              onChange={alCambiarMonto}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${idBase.current}-error` : undefined}
            />
          </CajaMonto>
          {interpretarMonto(monto) > 0 && <VistaMonto aria-live="polite">{ConvertirAMoneda(interpretarMonto(monto))}</VistaMonto>}
          <Ayuda>Cámbialo si esta vez pagaste un valor distinto.</Ayuda>
        </div>

        <div>
          <Etiqueta as="p">Fecha del pago</Etiqueta>
          <SelectorFecha valor={fecha} alCambiar={cambiarFecha} nombre="Fecha del pago" />
        </div>

        {error && <MensajeError role="alert" id={`${idBase.current}-error`}>{error}</MensajeError>}

        <Acciones>
          <BotonPrincipal type="submit" disabled={enviando}>
            {enviando ? <Espera aria-hidden="true" /> : null}
            Registrar pago
          </BotonPrincipal>
          <BotonSecundario type="button" onClick={omitir} disabled={enviando}>
            Omitir esta vez
          </BotonSecundario>
          {siguiente && <Ayuda style={{ textAlign: "center" }}>El siguiente vencimiento será el {fechaLegible(siguiente, hoy)}.</Ayuda>}
        </Acciones>
      </Formulario>
    </Hoja>
  );
};

export default HojaRegistrarPago;
