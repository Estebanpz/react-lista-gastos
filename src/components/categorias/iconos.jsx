import React from "react";

//Iconos de categoría: trazo único de 2 px en 24×24 (mismo estilo que components/auth/iconos.jsx).
//Los de `EXTRAS` son los que se pueden elegir al crear una categoría propia.
const TRAZOS = {
  cubiertos: (<><path d="M6 3v7a2 2 0 0 0 4 0V3" /><path d="M8 12v9" /><path d="M17 3c-2 2-3 5-3 8h3v10" /></>),
  cartera: (<><path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /><path d="m3 7 2-3h12" /><circle cx="16.5" cy="13.5" r="1" /></>),
  casa: (<><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>),
  bus: (<><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16" /><circle cx="8" cy="19.5" r="1.5" /><circle cx="16" cy="19.5" r="1.5" /></>),
  camiseta: (<path d="m8 3-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0z" />),
  corazon: (<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />),
  bolsa: (<><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  estrella: (<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />),
  equipo: (<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.3" /><path d="M17 14c2.2 0 4 1.8 4 4" /></>),
  recibo: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></>),
  tarjeta: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></>),
  banco: (<><path d="m3 10 9-6 9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 20h18" /></>),
  // ---- Extras elegibles al crear una categoría ----
  megafono: (<><path d="M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M19 9a4 4 0 0 1 0 6" /></>),
  caja: (<><path d="m3 7 9-4 9 4v10l-9 4-9-4V7z" /><path d="m3 7 9 4 9-4M12 11v10" /></>),
  camion: (<><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="2" /><circle cx="17" cy="17.5" r="2" /></>),
  maletin: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>),
  billete: (<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>),
  tienda: (<><path d="m4 9 1.5-5h13L20 9" /><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" /><path d="M5 12v8h14v-8" /></>),
  llave: (<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.6-.7-.7-2.6z" />),
  taza: (<><path d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" /><path d="M16 10h2a2 2 0 0 1 0 4h-2" /><path d="M8 3v2M12 3v2" /></>),
  flechas: (<><path d="M4 8h14l-3-3" /><path d="M20 16H6l3 3" /></>),
  avion: (<path d="m3 12 18-8-5 16-4-6-9-2z" />),
  pata: (<><circle cx="6" cy="10" r="1.8" /><circle cx="10" cy="6" r="1.8" /><circle cx="14" cy="6" r="1.8" /><circle cx="18" cy="10" r="1.8" /><path d="M12 12c-3 0-5 2.5-5 5 0 2 2 2.5 5 1.5 3 1 5 .5 5-1.5 0-2.5-2-5-5-5z" /></>),
  formas: (<><path d="m12 3 4 7H8l4-7z" /><rect x="3" y="14" width="7" height="7" rx="1" /><circle cx="17.5" cy="17.5" r="3.5" /></>),
};

export const EXTRAS = ["megafono", "caja", "camion", "maletin", "billete", "tienda", "llave", "taza", "flechas", "avion", "pata", "formas"];
export const IDS_ICONOS = Object.keys(TRAZOS);

const IconoCat = ({ clave, tam = 22, ...resto }) => (
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
    {TRAZOS[clave] || TRAZOS.formas}
  </svg>
);

export default IconoCat;
