const FormatearCantidad = (cantidad) => {
    return Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(cantidad);
}
 
export default FormatearCantidad;