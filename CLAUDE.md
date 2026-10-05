# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Idioma: todo (respuestas, comentarios, nombres, textos de UI) va en español.

## Reglas de seguridad para git

- **Nunca** versionar `.env`, `.env.*` (salvo `.env.example` con valores vacíos), claves privadas, cuentas de servicio de Firebase ni ninguna credencial. El `.gitignore` ya los cubre; no lo debilites.
- No hacer commits ni push sin que el usuario lo pida. Antes de cualquier `git add`, revisar `git status`.
- No leer ni imprimir el contenido de `.env`; si hace falta saber qué variables hay, listar solo los nombres.

## Comandos

Proyecto Create React App (react-scripts 5); el gestor de paquetes es npm y Node 22 (`.nvmrc`).

- `npm ci` — instala dependencias (el repo no incluye `node_modules`)
- `npm start` — servidor de desarrollo en http://localhost:3000
- `npm run build` — build de producción en `build/` (lo que sirve Firebase Hosting; rewrite SPA `**` → `/index.html` en `firebase.json`). Verificar siempre con `CI=true npm run build`: con `CI=true` los warnings de ESLint son errores, igual que en la mayoría de CI.
- `npm test` — Jest en modo watch; un solo test: `npm test -- -t "nombre"` o `npm test -- ruta/al/archivo`. Pruebas en `src/__tests__/` (utilidades compartidas en `src/testUtils/`). CRA resetea los mocks entre pruebas (`resetMocks: true`): define sus implementaciones dentro de `beforeEach`.
- `npm run e2e` — pruebas de extremo a extremo con Playwright (Chrome del sistema) contra emuladores de Auth/Firestore/Hosting en puertos 8180/9199/5050 y credenciales falsas (nunca toca el proyecto real). Compila en `build-e2e/`, no en `build/`. 32 pruebas: CSP y cabeceras, instalabilidad PWA, offline, cierre de sesión, acceso (gestos táctiles, Recordarme, recuperar contraseña), pantallas nuevas (categorías, filtros, borrado, edición, hoja y gestos en móvil) y actualización de versión. `CAPTURAS_DIR=<carpeta> npm run e2e -- 9-capturas` siembra datos y fotografía cada pantalla en PC y móvil (solo corre con esa variable).
- `npm run test:reglas` — 71 pruebas de `firestore.rules` contra el emulador (puerto 8181).
- `cd worker-recordatorios && npm test` — pruebas (`node --test`) del Worker de Cloudflare que envía los recordatorios; `npx wrangler deploy --dry-run` empaqueta sin desplegar. El Worker tiene su propio `package.json`; su secreto `GOOGLE_SA_JSON` se carga solo con `wrangler secret put` (nunca en el repo; en local, `.dev.vars` ignorado por git).

Las variables de Firebase se leen de `REACT_APP_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID` y `..._APP_ID` (ver `src/firebase/firebaseConfig.js`). Van en un `.env` / `.env.local` **sin versionar**; `.env.example` es la plantilla. Sin ellas la app compila pero no conecta con Auth/Firestore.

## Arquitectura

Gestor de gastos en español (React 17, react-router-dom v6, styled-components, SDK modular de Firebase para Auth + Firestore). Los identificadores, comentarios y textos de la UI están en español; mantén esa convención.

**Entrada y rutas** — `src/index.js` es la raíz de composición: `AuthProvider` → `CategoriasProvider` → `BrowserRouter` y todas las rutas (pantallas secundarias con `React.lazy`). `/inicio-sesion` y `/crear-cuenta` (`components/auth/PaginaAuth`) ocupan toda la ventana. Todo lo demás cuelga de una ruta de diseño `RutaPrivada` → `components/app/AppShell` (barra lateral en PC, barra superior + inferior en móvil, enlace «Saltar al contenido»): `/` Inicio, `/lista`, `/categorias`, `/editar-gasto/:id` y el 404. `RutaPrivada` redirige a `/inicio-sesion` si `useAuth().usuario` es falso; `AuthProvider` no renderiza hijos hasta el primer `onAuthStateChanged`.

**Capa de Firebase** — `src/firebase/firebaseConfig.js` inicializa la app y reexporta `auth`, `db` y las funciones de Firestore/Auth; los componentes y hooks importan desde ahí. Mutaciones en `src/firebase/` (`AgregarGasto`, `ActualizarGasto`, `BorrarGasto`, `categorias`, `autenticacion`, `cerrarSesion`); las escrituras pasan por `esperarEscritura`, que devuelve `"sincronizado"` o `"en-cola"` (sin conexión) en vez de colgarse. Datos: colección `gastos` `{descripcion, cantidad (Number), categoria, fecha (segundos Unix), uidUsuario}` y colección `categorias` (las propias de cada persona) `{nombre, icono, color, uidUsuario, creada}`. Toda consulta filtra por `uidUsuario == usuario.uid`. Un gasto guarda en `categoria` el id de una categoría por defecto (`functions/categorias.js`) o el id del documento de una propia.

**Seguridad de Firestore** — `firestore.rules` está versionado y referenciado en `firebase.json`: solo el dueño lee, edita o borra; se validan campos y tipos exactos. `categoria` de un gasto debe ser una de las 12 por defecto o una categoría propia existente de la misma persona (`get()` en las reglas); las propias validan nombre (1–30), icono y color dentro de los sets permitidos. Si cambias la lista de categorías, iconos o colores, actualiza a la vez `functions/categorias.js`, `functions/paleta.js`, `components/categorias/iconos.jsx` y `firestore.rules`, y corre `npm run test:reglas`. Las colecciones sin `match` quedan denegadas. No despliegues reglas sin confirmar con el usuario. Los índices compuestos están en `firestore.indexes.json`.

**Datos y cálculo** — `Hooks/useGastosRango(desde, hasta)` escucha en tiempo real los gastos del rango (índice uid + fecha); `useObtenerGasto(id)` lee uno para editar. `contexts/CategoriasContext` une las 12 por defecto con las propias (una sola escucha) y expone `porId` (devuelve «Sin categoría» si una propia se borró). `functions/resumen.js` reúne los cálculos puros (totales, por categoría, acumulado por día, agrupar, filtrar, ordenar, etiquetas de fecha) y es lo que más pruebas tiene.

**Pantallas** — `components/paginas/`: `PaginaInicio` (panel + `RegistroRapido`; en móvil, botón flotante que abre una `Hoja`), `PaginaLista` (mes, búsqueda, filtros, orden, por día/categoría, filas deslizables, detalle, borrado con confirmación), `PaginaCategorias` (ranking, dona, filtros, crear/editar/borrar propias, explicación inicial), `PaginaEditar`. Piezas en `components/gastos/` (`RegistroRapido`, `FilaDeslizable`, `DetalleGasto`, `ConfirmarBorrado`), `components/categorias/` (`CrearCategoria`, `Insignia`, iconos propios), `components/graficas/` (SVG propio, sin librería: línea, dona, barra) y `components/Hoja.jsx` (diálogo accesible: hoja inferior en móvil, modal en PC; foco atrapado, Escape, arrastrar para cerrar). Ilustraciones de unDraw en `src/img/undraw/` cargadas con `components/Ilustracion` (como `<img>`, no inflan el JS).

**Acceso (login y registro)** — `components/auth/PaginaAuth.jsx` sirve `/inicio-sesion` y `/crear-cuenta` con un solo componente: en móvil cabecera de marca + hoja inferior; en escritorio tarjeta de dos columnas. Fuera de `AppShell`, ocupa toda la ventana. Los dos formularios (`FormularioInicioSesion`, `FormularioRegistro`) viven en paneles de un carrusel que se desliza con el dedo (`@use-gesture/react`, solo toque) y también con pestañas/flechas; la URL refleja el panel activo. Lógica de Firebase en `firebase/autenticacion.js` («Recordarme» = persistencia local o de sesión; recuperar contraseña con `sendPasswordResetEmail`, respondiendo igual exista o no el correo) y mensajes de error en `functions/mensajesAuth.js`. La ilustración viene de unDraw (`src/img/undraw_mobile_payments.svg`, color principal cambiado a `#5B69E2`); para otra, buscar con `https://undraw.co/api/search?q=<término>` y reemplazar solo `#6c63ff`.

**UI** — los colores y tokens están en `src/theme.js` y las paletas de categorías en `src/functions/paleta.js`; los estilos son styled-components dentro de cada componente. Los iconos son SVG de un solo trazo dibujados a mano (`components/iconos.jsx`, `components/auth/iconos.jsx`, `components/categorias/iconos.jsx`). Cada pantalla respeta `prefers-reduced-motion`, usa foco visible y cuida el contraste AA. En React 17 no existe `useId`: se usan contadores propios.

## Diseño

`PRODUCT.md` (producto) lo mantiene la herramienta `impeccable` (instalada a nivel de usuario; comandos `/impeccable ...`). El diseño del acceso se exploró en Stitch (proyecto «Lista de Gastos»); la clave de API de Stitch vive solo en `~/.claude.json` y **nunca** se documenta ni se versiona. Contraste mínimo AA, foco visible, respeto de `prefers-reduced-motion`; el detector mecánico es `~/.claude/skills/impeccable/scripts/impeccable detect --json <rutas>`.

## Trabajo en curso

Hay un plan de mejora (build estable → buenas prácticas de React/accesibilidad → PWA con Workbox → gastos recurrentes con recordatorios push vía FCM y un script programado externo, en plan Firebase Spark). Consulta el estado en la memoria del proyecto antes de empezar.
