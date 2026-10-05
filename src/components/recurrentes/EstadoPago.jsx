import React from "react";
import styled from "styled-components";
import theme from "../../theme";
import { estadoPago, etiquetaVencimiento, fechaLegible, diasEntre } from "../../functions/recurrencias";

//Colores con contraste AA y siempre con texto: el estado nunca depende solo del color
const ESTILOS = {
  vencido: { fondo: "#FDE8E8", texto: "#B42318" },
  hoy: { fondo: "#FEF0C7", texto: "#93370D" },
  pronto: { fondo: theme.violetaSuave, texto: "#3E4BC7" },
  "al-dia": { fondo: theme.campo, texto: theme.tintaSuave },
  pausado: { fondo: theme.campo, texto: theme.tintaSuave },
};

const Pastilla = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 1.6rem;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: ${(p) => ESTILOS[p.$estado].fondo};
  color: ${(p) => ESTILOS[p.$estado].texto};
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
`;

//Estado de un pago para la interfaz: pausado | vencido | hoy | pronto | al-dia
export const estadoVisible = (rec, hoy) => (rec.activo ? estadoPago(rec, hoy) : "pausado");

//«Venció hace 2 días», «Vence hoy», «Vence mañana», «En 3 días», «12 de noviembre», «Pausado»
export const textoEstado = (rec, hoy) => {
  const estado = estadoVisible(rec, hoy);
  if (estado === "pausado") return "Pausado";
  if (estado === "al-dia") return fechaLegible(rec.proximaFecha, hoy);
  const texto = etiquetaVencimiento(rec, hoy);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

//Se puede registrar desde la lista cuando ya venció o vence en la próxima semana
export const sePuedeRegistrar = (rec, hoy) => rec.activo && diasEntre(hoy, rec.proximaFecha) <= 7;

const EstadoPago = ({ recurrente, hoy }) => <Pastilla $estado={estadoVisible(recurrente, hoy)}>{textoEstado(recurrente, hoy)}</Pastilla>;

export default EstadoPago;
