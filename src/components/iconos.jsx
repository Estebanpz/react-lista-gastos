import React from "react";

//Iconos de la app (trazo único 24×24). Son decorativos: el sentido lo da el texto o el aria-label del botón.
const Icono = ({ tam = 20, children, ...resto }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...resto}>
    {children}
  </svg>
);

export const IconoInicio = (p) => (<Icono {...p}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Icono>);
export const IconoLista = (p) => (<Icono {...p}><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></Icono>);
export const IconoCategorias = (p) => (<Icono {...p}><path d="m12 3 4 7H8l4-7z" /><rect x="3" y="14" width="7" height="7" rx="1" /><circle cx="17.5" cy="17.5" r="3.5" /></Icono>);
export const IconoSalir = (p) => (<Icono {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Icono>);
export const IconoMas = (p) => (<Icono {...p}><path d="M12 5v14M5 12h14" /></Icono>);
export const IconoBuscar = (p) => (<Icono {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icono>);
export const IconoFiltro = (p) => (<Icono {...p}><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" /></Icono>);
export const IconoEditar = (p) => (<Icono {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></Icono>);
export const IconoBorrar = (p) => (<Icono {...p}><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Icono>);
export const IconoCerrar = (p) => (<Icono {...p}><path d="M18 6 6 18M6 6l12 12" /></Icono>);
export const IconoCheck = (p) => (<Icono {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icono>);
export const IconoIzquierda = (p) => (<Icono {...p}><path d="m15 18-6-6 6-6" /></Icono>);
export const IconoDerecha = (p) => (<Icono {...p}><path d="m9 18 6-6-6-6" /></Icono>);
export const IconoCalendario = (p) => (<Icono {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icono>);
export const IconoNota = (p) => (<Icono {...p}><path d="M4 6h16M4 12h16M4 18h10" /></Icono>);
export const IconoEtiqueta = (p) => (<Icono {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1" /></Icono>);
export const IconoInstalar = (p) => (<Icono {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></Icono>);
export const IconoRegresar = (p) => (<Icono {...p}><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></Icono>);
