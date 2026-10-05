# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas en Colombia que llevan sus gastos personales o del hogar y, a la vez, los pagos de un pequeño negocio (nómina de colaboradores, recibos, créditos). Hoy el uso es privado: la persona que lo construyó y gente cercana. Lo usan sobre todo desde el celular, a menudo en movimiento y a veces sin conexión, para registrar un gasto en pocos segundos y revisar cuánto llevan en el mes. Un login limpio protege sus datos, no capta público.

## Product Purpose

Finanzas (antes «Lista de Gastos»; dominio finanzas.zfmanager.com) registra gastos por categoría y fecha, muestra el total del mes y el desglose por categoría. Su siguiente capacidad son los gastos recurrentes (nómina, recibos, créditos) con recordatorios. Éxito: registrar un gasto es tan rápido que la persona lo hace en el momento y no al final del día, y ningún pago recurrente se olvida.

## Positioning

Una PWA instalable que funciona sin conexión y sincroniza sola al volver, con registro de gastos muy rápido y recordatorios de pagos recurrentes, sin conectar bancos ni configuraciones complicadas. Un gestor de gastos nativo-bancario no puede prometer ni la simplicidad total ni el uso sin red.

## Operating Context

- Se instala desde el navegador (Chrome/Edge en Android y escritorio; en iOS con «Agregar a inicio») y se abre como app.
- Los datos viven en Firebase (Auth con correo y contraseña, Firestore con caché local persistente); las escrituras sin red quedan en cola y se sincronizan al reconectar.
- Moneda COP, idioma español (es-CO), fechas en formato largo («04 de octubre de 2026»).
- Despliegue en Firebase Hosting con CSP estricta (sin scripts inline; los estilos en línea sí están permitidos).

## Capabilities and Constraints

- Solo gastos: «nómina» es un pago a colaboradores, es decir, un gasto; no hay ingresos.
- Ocho categorías fijas: comida, cuentas y pagos, hogar, transporte, ropa, salud e higiene, compras, diversión.
- Acceso por correo y contraseña; cuentas creadas por registro propio. Registro abierto al público: no decidido (por ahora uso privado).
- Stack: React 17 (Create React App), styled-components, react-router 6. Plan de Firebase Spark (sin Cloud Functions). Bundle ya en ~270 kB gzip: cualquier librería nueva debe justificar su peso.
- Decisión abierta: gestos móviles (deslizar para editar/borrar, jalar para actualizar) y librería de animación, por definir.

## Brand Commitments

- Nombre: «Finanzas» (antes «Lista de Gastos»). Dominio: finanzas.zfmanager.com.
- Logo: pila de monedas verde con símbolo $ (`src/img/logo.png`, iconos de la PWA en `public/`).
- El usuario pidió **partir del estilo actual** (tipografía Work Sans, azul-violeta `#5B69E2`, verde `#43A854`, botones negros, ilustraciones del login y registro en `src/img/`) y mejorarlo, no reemplazarlo.

## Evidence on Hand

- Pantallas reales en producción de prueba (canal de vista previa de Hosting) usadas en celular y escritorio, con instalación PWA y modo sin conexión verificados por el usuario.
- Capturas del login actual: `public/captura-movil.png` y `public/captura-escritorio.png`.
- Sin testimonios, métricas de uso ni datos de usuarios: no inventarlos.

## Product Principles

1. Registrar un gasto cuesta pocos toques y nunca depende de la red.
2. Sencillez antes que funciones: nada de configuraciones ni conexiones bancarias.
3. La app se siente nativa: instalable, gestos del celular, respuesta inmediata.
4. Los datos de la persona son privados: lo que no hace falta mostrar o guardar, no se muestra ni se guarda.
5. Todo en español claro y de uso colombiano.

## Accessibility & Inclusion

Teclado completo y foco visible, etiquetas en todos los campos, respeto de `prefers-reduced-motion`, objetivos táctiles cómodos y revisión con las Web Interface Guidelines de Vercel. Sin norma formal exigida más allá de eso.
