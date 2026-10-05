const theme = {
    fondo: '#F9F9F9',
    colorPrimario: '#5B69E2',
    colorSecundario: '#000',
    verde: '#43A854',
    rojo: '#E34747',
    grisClaro: '#E8EFF1',
    grisClaro2: '#CBDDE2',
    azulClaro: '#8792F1',
    // Pantalla de acceso (login y registro). Los textos verdes oscuros cumplen contraste AA sobre blanco.
    verdeTexto: '#1F6F3A',
    violetaSuave: '#EEF0FE',
    verdeSuave: '#E9F6EC',
    tinta: '#14161F',
    tintaSuave: '#4A5568',
    placeholder: '#6B7280',
    borde: '#D5DCE0',
    bordeCampo: '#8A94A6', // 3,06:1 sobre blanco: el contorno de un campo debe distinguirse (WCAG 1.4.11)
    campo: '#F6F8FA',
    // Saltos de diseño (media queries). El marco cambia a barra lateral (16,5rem) en `pantallaAncha`;
    // las páginas solo pasan a dos columnas (lista + panel de 22rem) cuando la columna principal
    // conserva ~30rem: 16,5 de barra + 5 de márgenes + 22 de panel + 1,5 de separación + 30 ≈ 75rem.
    pantallaAncha: '(min-width: 60rem)',
    dosColumnas: '(min-width: 75rem)'
}

export default theme;