import React from "react";
import styled from "styled-components";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";
import theme from "../../theme";

//react-day-picker con los colores y el tamaño táctil de la app. Se carga con React.lazy solo al abrir una hoja de fecha.
const Contenedor = styled.div`
  display: flex;
  justify-content: center;
  font-family: inherit;
  color: ${theme.tinta};
  overflow-x: auto;

  /* La librería define sus variables en .rdp: hay que sobrescribirlas ahí */
  .rdp {
    --rdp-cell-size: 2.75rem;
    --rdp-accent-color: #3e4bc7; /* 6,3:1 con texto blanco (AA) */
    --rdp-background-color: ${theme.violetaSuave};
    --rdp-accent-color-dark: #3e4bc7;
    --rdp-background-color-dark: ${theme.violetaSuave};
    --rdp-outline: 3px solid ${theme.tinta};
    --rdp-outline-selected: 3px solid ${theme.tinta};
    --rdp-selected-color: #fff;
    --rdp-caption-font-size: 1rem;
    margin: 0;
    font-size: 0.9375rem;
  }

  .rdp-caption_label {
    font-weight: 800;
    letter-spacing: -0.01em;
    text-transform: capitalize;
  }

  .rdp-head_cell {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${theme.tintaSuave};
  }

  .rdp-day {
    font: inherit;
    font-weight: 600;
  }

  .rdp-day_today:not(.rdp-day_selected) {
    font-weight: 800;
    color: #3e4bc7;
    box-shadow: inset 0 0 0 2px ${theme.violetaSuave};
  }

  .rdp-day_selected {
    font-weight: 800;
  }

  .rdp-day_selected.rdp-day_range_middle {
    background-color: ${theme.violetaSuave};
    color: #2b3499;
  }

  .rdp-day_selected.rdp-day_range_start,
  .rdp-day_selected.rdp-day_range_end {
    background-color: #3e4bc7;
    color: #fff;
  }

  .rdp-day_outside {
    opacity: 0.45;
  }

  .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
    background-color: ${theme.violetaSuave};
  }

  .rdp-nav_button {
    width: 2.75rem;
    height: 2.75rem;
  }

  .rdp-dropdown_month,
  .rdp-dropdown_year {
    font-weight: 700;
  }

  .rdp-dropdown {
    font: inherit;
    font-size: ${theme.letraCampo}; /* evita el zoom de Safari en iPhone al tocar mes o año */
    font-weight: 700;
  }

  .rdp-button:focus-visible:not([disabled]),
  .rdp-dropdown:focus-visible {
    outline: 3px solid ${theme.tinta};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
`;

//Textos accesibles en español (los de la librería vienen en inglés)
const etiquetas = {
  labelPrevious: () => "Mes anterior",
  labelNext: () => "Mes siguiente",
  labelMonthDropdown: () => "Mes",
  labelYearDropdown: () => "Año",
  labelDay: (dia) => format(dia, "d 'de' MMMM 'de' yyyy", { locale: es }),
  labelWeekday: (dia) => format(dia, "EEEE", { locale: es }),
};

//El botón de cada día solo trae el número: se le añade la fecha completa para lectores de pantalla
const ContenidoDia = ({ date }) => (
  <>
    <span aria-hidden="true">{date.getDate()}</span>
    <span className="rdp-vhidden">{etiquetas.labelDay(date)}</span>
  </>
);

const Calendario = ({ mode = "single", selected, onSelect, defaultMonth, hasta, meses = 1 }) => {
  const anioFinal = hasta ? hasta.getFullYear() : new Date().getFullYear() + 1;
  return (
    <Contenedor>
      <DayPicker
        mode={mode}
        selected={selected}
        onSelect={onSelect}
        defaultMonth={defaultMonth || (mode === "range" ? selected?.from : selected) || new Date()}
        numberOfMonths={meses}
        locale={es}
        labels={etiquetas}
        components={{ DayContent: ContenidoDia }}
        weekStartsOn={1}
        captionLayout="dropdown-buttons"
        fromYear={2015}
        toYear={anioFinal}
        disabled={hasta ? { after: hasta } : undefined}
        required={mode === "single"}
        showOutsideDays
        fixedWeeks
      />
    </Contenedor>
  );
};

export default Calendario;
