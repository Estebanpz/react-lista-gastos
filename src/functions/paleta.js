//Paleta para categorías. `base` se usa en barras y gráficas; `oscuro` en iconos y textos sobre el
//tinte (cumple contraste AA/UI ≥3:1 sobre blanco); el fondo del icono es `base` con 16 % de opacidad.
const COLORES = [
  { id: "indigo", base: "#5B69E2", oscuro: "#3E4BC7" },
  { id: "verde", base: "#43A854", oscuro: "#1F7A3A" },
  { id: "naranja", base: "#F59E0B", oscuro: "#9A5B00" },
  { id: "azul", base: "#0EA5E9", oscuro: "#0369A1" },
  { id: "rosa", base: "#F43F5E", oscuro: "#BE123C" },
  { id: "violeta", base: "#9333EA", oscuro: "#6B21A8" },
  { id: "turquesa", base: "#14B8A6", oscuro: "#0F766E" },
  { id: "coral", base: "#F97316", oscuro: "#C2410C" },
];

export const colorPorId = (id) => COLORES.find((c) => c.id === id) || COLORES[0];
export const IDS_COLORES = COLORES.map((c) => c.id);
export default COLORES;
