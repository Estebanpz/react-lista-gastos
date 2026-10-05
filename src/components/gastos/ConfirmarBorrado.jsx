import React, { useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Hoja from "../Hoja";
import Ilustracion from "../Ilustracion";
import { Espera, MensajeError } from "../auth/elementos";
import { IconoBorrar } from "../iconos";

const Centro = styled.div`
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  text-align: center;

  p {
    max-width: 24rem;
    color: ${theme.tintaSuave};
    line-height: 1.45;
  }
`;

const Resumen = styled.div`
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  background: ${theme.campo};
  font-weight: 700;
  color: ${theme.tinta};
  overflow-wrap: anywhere;
`;

const Botones = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.75rem;
`;

const Cancelar = styled.button`
  min-height: 3.5rem;
  border: 0;
  border-radius: 999px;
  background: ${theme.campo};
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.tinta};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

const Peligro = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3.5rem;
  border: 0;
  border-radius: 999px;
  background: #b42323;
  color: #fff;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #9b1c1c;
  }

  &:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 3px;
  }

  &[aria-busy="true"] {
    cursor: progress;
    opacity: 0.85;
  }
`;

//Confirmación antes de borrar (gasto o categoría). `resumen` es la línea que identifica lo que se borra.
const ConfirmarBorrado = ({ abierta, alCerrar, alConfirmar, titulo, mensaje, resumen }) => {
  const [enviando, cambiarEnviando] = useState(false);
  const [error, cambiarError] = useState("");

  const confirmar = async () => {
    if (enviando) return;
    cambiarEnviando(true);
    cambiarError("");
    try {
      await alConfirmar();
      cambiarEnviando(false);
      alCerrar();
    } catch (e) {
      console.log(e);
      cambiarEnviando(false);
      cambiarError("No se pudo borrar. Inténtalo de nuevo.");
    }
  };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={titulo} rol="alertdialog">
      <Centro>
        <Ilustracion nombre="borrar" ancho="10rem" />
        <p>{mensaje}</p>
        {resumen && <Resumen>{resumen}</Resumen>}
        {error && <MensajeError role="alert">{error}</MensajeError>}
        <Botones>
          <Cancelar type="button" onClick={alCerrar}>Cancelar</Cancelar>
          <Peligro type="button" aria-busy={enviando} onClick={confirmar}>
            {enviando ? <><Espera aria-hidden="true" /> Borrando…</> : <><IconoBorrar tam={18} /> Borrar</>}
          </Peligro>
        </Botones>
      </Centro>
    </Hoja>
  );
};

export default ConfirmarBorrado;
