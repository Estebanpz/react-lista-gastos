import React, { useEffect, useRef, useState } from "react";
import Hoja from "../Hoja";
import { BotonPrincipal, Espera, MensajeError } from "../auth/elementos";
import { Formulario, Etiqueta, Entrada, Ayuda } from "../recurrentes/elementos";
import { DIAS_PRUEBA_MIN, DIAS_PRUEBA_MAX, nuevoVencimiento } from "../../functions/planes";
import { darDiasPrueba } from "../../firebase/clientes";
import { fechaCorta } from "./elementos";

let contador = 0;

//Días de prueba (cortesía) para un cliente que ya existe: se suman al vencimiento sin cobrar y quedan en el historial con $0
const HojaDiasPrueba = ({ cliente, alCerrar }) => {
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `diasprueba-${++contador}`;
  const id = idBase.current;
  const [dias, cambiarDias] = useState("7");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    cambiarDias("7");
    cambiarError("");
    cambiarEnviando(false);
  }, [cliente]);

  if (!cliente) return null;
  const n = Number(dias);
  const valido = dias !== "" && Number.isInteger(n) && n >= DIAS_PRUEBA_MIN && n <= DIAS_PRUEBA_MAX;

  const guardar = async (e) => {
    e.preventDefault();
    if (!valido) return cambiarError(`Escribe un número de días entre ${DIAS_PRUEBA_MIN} y ${DIAS_PRUEBA_MAX}.`);
    cambiarEnviando(true);
    try {
      await darDiasPrueba(cliente, n);
      alCerrar(true);
    } catch (err) {
      console.log(err);
      cambiarError(err && err.code === "permission-denied" ? "Sin permiso: solo el super admin puede dar días de prueba." : "No pudimos guardar los días. Inténtalo de nuevo.");
      cambiarEnviando(false);
    }
  };

  return (
    <Hoja abierta alCerrar={() => alCerrar(false)} titulo="Dar días de prueba" subtitulo={cliente.correo}>
      <Formulario onSubmit={guardar} noValidate aria-busy={enviando}>
        <div>
          <Etiqueta htmlFor={`${id}-dias`}>Días</Etiqueta>
          <Entrada
            id={`${id}-dias`}
            name="dias"
            inputMode="numeric"
            autoComplete="off"
            value={dias}
            onChange={(e) => {
              cambiarDias(e.target.value.replace(/\D/g, ""));
              cambiarError("");
            }}
          />
        </div>
        <Ayuda>
          Se suman al vencimiento actual ({fechaCorta(cliente.vence)}) o desde hoy si ya venció. No se cobra: queda en el historial con $0.
          {valido ? ` Nuevo vencimiento: ${fechaCorta(nuevoVencimiento(cliente.vence, n))}.` : ""}
        </Ayuda>
        {error && <MensajeError role="alert">{error}</MensajeError>}
        <BotonPrincipal type="submit" disabled={enviando}>
          {enviando ? <Espera aria-hidden="true" /> : null}
          Dar días
        </BotonPrincipal>
      </Formulario>
    </Hoja>
  );
};

export default HojaDiasPrueba;
