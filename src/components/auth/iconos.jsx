import React from "react";

//Iconos dibujados con un solo trazo (24×24, 2px, extremos redondeados). Son decorativos:
//el significado lo da siempre el texto o el aria-label del botón que los contiene.
const Icono = ({ tam = 20, children, ...resto }) => (
  <svg
    width={tam}
    height={tam}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...resto}
  >
    {children}
  </svg>
);

export const IconoCorreo = (p) => (
  <Icono {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icono>
);

export const IconoCandado = (p) => (
  <Icono {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icono>
);

export const IconoOjo = (p) => (
  <Icono {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icono>
);

export const IconoOjoTachado = (p) => (
  <Icono {...p}>
    <path d="M10.7 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.2" />
    <path d="M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m2 2 20 20" />
  </Icono>
);

export const IconoFlecha = (p) => (
  <Icono {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icono>
);

export const IconoSinConexion = (p) => (
  <Icono {...p}>
    <path d="M12 20h.01" />
    <path d="M8.5 16.4a5 5 0 0 1 7 0" />
    <path d="M5 12.9a10 10 0 0 1 5.2-2.7" />
    <path d="M19 12.9a10 10 0 0 0-2.1-1.6" />
    <path d="M2 8.8a15 15 0 0 1 4.2-2.6" />
    <path d="M22 8.8a15 15 0 0 0-11.3-3.7" />
    <path d="m2 2 20 20" />
  </Icono>
);

export const IconoCampana = (p) => (
  <Icono {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Icono>
);

export const IconoRayo = (p) => (
  <Icono {...p}>
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
  </Icono>
);

export const IconoRegresar = (p) => (
  <Icono {...p}>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </Icono>
);
