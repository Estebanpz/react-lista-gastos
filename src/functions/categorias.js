//Categorías que vienen con la app. Los ids deben coincidir con la lista de firestore.rules.
//`nueva: true` marca las que se añadieron para pagos de un negocio (se muestran con la etiqueta «Nuevo»).
const CATEGORIAS_BASE = [
  { id: "comida", texto: "Comida", icono: "cubiertos", color: "coral" },
  { id: "cuentas y pagos", texto: "Cuentas y pagos", icono: "cartera", color: "azul" },
  { id: "hogar", texto: "Hogar", icono: "casa", color: "turquesa" },
  { id: "transporte", texto: "Transporte", icono: "bus", color: "indigo" },
  { id: "ropa", texto: "Ropa", icono: "camiseta", color: "violeta" },
  { id: "salud e higiene", texto: "Salud e higiene", icono: "corazon", color: "rosa" },
  { id: "compras", texto: "Compras", icono: "bolsa", color: "naranja" },
  { id: "diversion", texto: "Diversión", icono: "estrella", color: "verde" },
  { id: "nomina", texto: "Nómina", icono: "equipo", color: "indigo", nueva: true, detalle: "pago a colaboradores" },
  { id: "recibos", texto: "Recibos", icono: "recibo", color: "verde", nueva: true, detalle: "servicios y suscripciones" },
  { id: "creditos", texto: "Créditos", icono: "tarjeta", color: "azul", nueva: true, detalle: "cuotas y préstamos" },
  { id: "impuestos", texto: "Impuestos", icono: "banco", color: "violeta", nueva: true, detalle: "tributos y retenciones" },
];

export const IDS_BASE = CATEGORIAS_BASE.map((c) => c.id);
export const SIN_CATEGORIA = { id: "sin-categoria", texto: "Sin categoría", icono: "formas", color: "indigo" };
export default CATEGORIAS_BASE;
