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
- `npm test` — Jest en modo watch; un solo test: `npm test -- -t "nombre"` o `npm test -- ruta/al/archivo`. Actualmente no hay archivos de test.
- `npm run e2e` — pruebas de extremo a extremo con Playwright (Chrome del sistema) contra emuladores de Auth/Firestore/Hosting en puertos 8180/9199/5050 y credenciales falsas (nunca toca el proyecto real). Compila en `build-e2e/`, no en `build/`. 23 pruebas: CSP y cabeceras, instalabilidad PWA, offline, cierre de sesión, acceso (gestos táctiles, Recordarme, recuperar contraseña) y actualización de versión.
- Probar reglas de Firestore: `firebase emulators:exec --only firestore --project demo-reglas "node <script-de-pruebas>.js"` (requiere Java; el emulador usa el puerto 8080 de `firebase.json`).

Las variables de Firebase se leen de `REACT_APP_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID` y `..._APP_ID` (ver `src/firebase/firebaseConfig.js`). Van en un `.env` / `.env.local` **sin versionar**; `.env.example` es la plantilla. Sin ellas la app compila pero no conecta con Auth/Firestore.

## Arquitectura

Gestor de gastos en español (React 17, react-router-dom v6, styled-components, SDK modular de Firebase para Auth + Firestore). Los identificadores, comentarios y textos de la UI están en español; mantén esa convención.

**Entrada y rutas** — `src/index.js` (no `App.js`) es la raíz de composición real: envuelve todo en `AuthProvider` → `TotalGastadoProvider` → `BrowserRouter` y declara todas las rutas. `src/App.js` es solo la página «Agregar Gasto» montada en `/`. Todas las rutas, salvo `/inicio-sesion`, `/crear-cuenta` y el 404 `*`, van envueltas en `components/RutaPrivada`, que redirige a `/inicio-sesion` cuando `useAuth().usuario` es falso. `AuthProvider` no renderiza hijos hasta que se dispara el primer `onAuthStateChanged`, así que dentro del árbol `usuario` nunca está «sin resolver».

**Capa de Firebase** — `src/firebase/firebaseConfig.js` inicializa la app y reexporta `auth`, `db` y las funciones de Firestore/Auth que se usan en el resto; los componentes y hooks importan desde ahí y no directamente de `firebase/*` (aunque `AgregarGasto.js` importa `addDoc` de `firebase/firestore`). Las mutaciones viven en `src/firebase/{AgregarGasto,ActualizarGasto,BorrarGasto}.js`. Todos los datos están en una única colección raíz `gastos` con documentos `{descripcion, cantidad (Number), categoria, fecha (segundos Unix, con getUnixTime de date-fns), uidUsuario}`. Toda consulta filtra por `uidUsuario == usuario.uid`.

**Seguridad de Firestore** — `firestore.rules` está versionado y referenciado en `firebase.json`: solo el dueño (`uidUsuario == request.auth.uid`) puede leer, editar o borrar; al crear/editar se validan los campos exactos y tipos (`cantidad` número > 0, `categoria` dentro de la lista fija). Las colecciones sin `match` quedan denegadas por defecto, así que una colección nueva (p. ej. `recurrentes`, `usuarios/{uid}/tokens`) necesita su regla. Cambia las reglas solo con pruebas en el emulador y no las despliegues sin confirmar con el usuario. Los índices compuestos están en `firestore.indexes.json`.

**Hooks de datos (`src/Hooks/`)** — leen datos con listeners en tiempo real `onSnapshot` de Firestore:
- `useObtenerGastos` — lista paginada (de 10 en 10, `startAfter`), devuelve `[gastos, obtenerMasGastos, hayMasPorCargar]`.
- `useObtenerGastosMes` — gastos del mes actual (`fecha` entre inicio y fin de mes).
- `useObtenerGastosDelMesCategoria` — se apoya en el hook del mes y lo reduce a totales por categoría; las claves de categoría están fijas en el hook y deben coincidir con los nombres de `components/SelectCategorias.jsx` y con los iconos de `elementos/IconoCategoria.js` / `src/img/cat_*.svg` (y con la lista de `firestore.rules`).
- `useObtenerGasto(id)` — `getDoc` puntual para la página de edición; navega a `/lista` si no existe.

Las consultas que combinan `where` sobre `fecha`/`uidUsuario` con `orderBy("fecha")` necesitan índices compuestos de Firestore (definidos en `firestore.indexes.json`).

**Acceso (login y registro)** — `components/auth/PaginaAuth.jsx` sirve `/inicio-sesion` y `/crear-cuenta` con un solo componente: en móvil cabecera de marca + hoja inferior; en escritorio tarjeta de dos columnas. Fuera de `DisenoApp` (la tarjeta blanca de `index.js`), ocupa toda la ventana. Los dos formularios (`FormularioInicioSesion`, `FormularioRegistro`) viven en paneles de un carrusel que se desliza con el dedo (`@use-gesture/react`, solo toque) y también con pestañas/flechas; la URL refleja el panel activo. Lógica de Firebase en `firebase/autenticacion.js` («Recordarme» = persistencia local o de sesión; recuperar contraseña con `sendPasswordResetEmail`, respondiendo igual exista o no el correo) y mensajes de error en `functions/mensajesAuth.js`. La ilustración viene de unDraw (`src/img/undraw_mobile_payments.svg`, color principal cambiado a `#5B69E2`); para otra, buscar con `https://undraw.co/api/search?q=<término>` y reemplazar solo `#6c63ff`.

**Contexto** — `AuthContext` (el `usuario` actual) y `TotalGastadoContext`, que se suscribe a los gastos del mes actual y expone `totalGastado` para `BarraTotalGastado`. `TotalGastadoProvider` está por encima del router y llama a `useObtenerGastosMes`, que depende de `useAuth`, por lo que requiere que `AuthProvider` sea su ancestro.

**Agregar vs. editar** — `components/FormularioGasto.jsx` sirve para ambos flujos: cuando recibe la prop `gasto` (desde `EditarGasto`, ruta `/editar-gasto/:id`) pasa a modo edición y redirige a `/lista` si `gasto.uidUsuario` no coincide con el usuario logueado.

**UI** — los styled-components presentacionales viven en `src/elementos/` (Header, Boton, ElementosDeFormulario, ElementosDeLista, …) con los colores en `src/theme.js`; los componentes de funcionalidad viven en `src/components/`. Los SVG se importan como componentes de React (`import { ReactComponent as X } from "./img/x.svg"`).

## Diseño

`PRODUCT.md` (producto) lo mantiene la herramienta `impeccable` (instalada a nivel de usuario; comandos `/impeccable ...`). El diseño del acceso se exploró en Stitch (proyecto «Lista de Gastos»); la clave de API de Stitch vive solo en `~/.claude.json` y **nunca** se documenta ni se versiona. Contraste mínimo AA, foco visible, respeto de `prefers-reduced-motion`; el detector mecánico es `~/.claude/skills/impeccable/scripts/impeccable detect --json <rutas>`.

## Trabajo en curso

Hay un plan de mejora (build estable → buenas prácticas de React/accesibilidad → PWA con Workbox → gastos recurrentes con recordatorios push vía FCM y un script programado externo, en plan Firebase Spark). Consulta el estado en la memoria del proyecto antes de empezar.
