import React, { useEffect, useRef, useState } from "react";
import Hoja from "../Hoja";
import { BotonPrincipal, Espera, MensajeError } from "../auth/elementos";
import ConvertirAMoneda from "../../functions/ConvertirAMoneda";
import { Formulario, Etiqueta, Entrada, Seleccion, Ayuda, CajaMonto, VistaMonto } from "../recurrentes/elementos";
import { PLANES, IDS_PLAN, nuevoVencimiento } from "../../functions/planes";
import { registrarPagoPlan } from "../../firebase/clientes";
import { interpretarMonto } from "../gastos/RegistroRapido";
import { fechaCorta } from "./elementos";

let contador = 0;

//Registra el pago de un cliente: asiento en el historial y vencimiento extendido (nunca se acorta un plazo vigente).
const HojaPagoPlan = ({ cliente, alCerrar }) => {
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `pagoplan-${++contador}`;
  const id = idBase.current;
  const [plan, cambiarPlan] = useState("basico");
  const [monto, cambiarMonto] = useState("");
  const [referencia, cambiarReferencia] = useState("");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    cambiarPlan(cliente.plan === "prueba" ? "basico" : cliente.plan);
    cambiarMonto(String(PLANES[cliente.plan === "prueba" ? "basico" : cliente.plan].precio));
    cambiarReferencia("");
    cambiarError("");
    cambiarEnviando(false);
  }, [cliente]);

  if (!cliente) return null;
  const nuevo = nuevoVencimiento(cliente.vence, PLANES[plan].dias);

  const alElegirPlan = (e) => {
    cambiarPlan(e.target.value);
    cambiarMonto(String(PLANES[e.target.value].precio));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const valor = interpretarMonto(monto);
    if (!valor) return cambiarError("Escribe cuánto pagó.");
    cambiarEnviando(true);
    try {
      await registrarPagoPlan(cliente, { plan, monto: valor, referencia });
      alCerrar(true);
    } catch (err) {
      console.log(err);
      cambiarError(err && err.code === "permission-denied" ? "Sin permiso: solo el super admin puede registrar pagos." : "No pudimos registrar el pago. Inténtalo de nuevo.");
      cambiarEnviando(false);
    }
  };

  return (
    <Hoja abierta alCerrar={() => alCerrar(false)} titulo="Registrar pago" subtitulo={cliente.correo}>
      <Formulario onSubmit={guardar} noValidate aria-busy={enviando}>
        <div>
          <Etiqueta htmlFor={`${id}-plan`}>Plan pagado</Etiqueta>
          <Seleccion id={`${id}-plan`} value={plan} onChange={alElegirPlan}>
            {IDS_PLAN.filter((p) => p !== "prueba").map((p) => (
              <option key={p} value={p}>
                {PLANES[p].nombre}
              </option>
            ))}
          </Seleccion>
        </div>
        <div>
          <Etiqueta htmlFor={`${id}-monto`}>Monto recibido (COP)</Etiqueta>
          <CajaMonto $error={Boolean(error)}>
            <span aria-hidden="true">$</span>
            <input id={`${id}-monto`} inputMode="decimal" autoComplete="off" value={monto} onChange={(e) => cambiarMonto(e.target.value.replace(/[^\d.,]/g, ""))} />
          </CajaMonto>
          {interpretarMonto(monto) > 0 && <VistaMonto aria-live="polite">{ConvertirAMoneda(interpretarMonto(monto))}</VistaMonto>}
        </div>
        <div>
          <Etiqueta htmlFor={`${id}-ref`}>Referencia (opcional)</Etiqueta>
          <Entrada id={`${id}-ref`} autoComplete="off" maxLength={80} placeholder="Nequi, Bre-B, transferencia…" value={referencia} onChange={(e) => cambiarReferencia(e.target.value)} />
        </div>
        <Ayuda>
          Vencimiento actual: {fechaCorta(cliente.vence)}. Con este pago pasará al {fechaCorta(nuevo)}.
        </Ayuda>
        {error && <MensajeError role="alert">{error}</MensajeError>}
        <BotonPrincipal type="submit" disabled={enviando}>
          {enviando ? <Espera aria-hidden="true" /> : null}
          Registrar pago
        </BotonPrincipal>
      </Formulario>
    </Hoja>
  );
};

export default HojaPagoPlan;
