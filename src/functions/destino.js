//Destino tras iniciar sesión: la página que la persona quería abrir (p. ej. al tocar una notificación
//sin sesión abierta). Solo rutas internas: nada de dominios externos ni de volver al propio acceso.
const RUTAS_ACCESO = ["/inicio-sesion", "/crear-cuenta"];

export const destinoTrasLogin = (estado) => {
  const desde = estado && estado.desde;
  if (typeof desde !== "string" || !desde.startsWith("/") || desde.startsWith("//") || desde.includes("\\")) return "/";
  return RUTAS_ACCESO.some((r) => desde === r || desde.startsWith(`${r}?`)) ? "/" : desde;
};
