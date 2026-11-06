# Plan: historial del cliente, barra con fijos, días de prueba y SMS de recordatorio

Estado: **Fase 0 en curso** (6 nov 2026): rama creada y `npm ci` hecho; falta correr las reglas con Node v22.19.0 y los pasos 4 a 6. Se ejecuta en la rama `feature/admin-prueba-sms`, en el orden de este documento,
con multi-agentes (§3). Al aprobarse, este archivo se copia tal cual a `docs/PLAN_ADMIN_PRUEBA_SMS.md` (Fase 0).

> Para quien implementa: este documento manda. Copia tal cual los nombres, rutas, textos y código. Si el código no coincide con lo
> que se describe, **detente y repórtalo**. No improvises una alternativa, no mejores código vecino y no decidas nada de alcance o diseño.

## 0. Contexto

El dueño pidió cuatro mejoras:

| # | Pedido | Qué hay hoy | Qué se construye |
|---|---|---|---|
| 1 | Historial real y paginado en la ficha del cliente (`/admin`) | `HojaCliente` lista todos los `pagosPlan` sin paginar y solo el uso del mes en curso | Pagos del plan paginados de 5 en 5 + sección «Uso por mes» (todos los meses, 6 por página) |
| 2 | La barra «Gastos del mes» debe mostrar también los fijos | `uso/{uid}_{año}_{mes}.gastos` suma variables y pagos fijos juntos, sin distinguirlos | Campo nuevo `fijos` en el mismo documento; barra partida «variables + fijos» |
| 3 | Días de prueba asignables | El plan Prueba siempre da 30 días | Campo «Días de prueba» (1–90) al crear o pasar a Prueba + botón «Dar días de prueba» en la ficha |
| 4 | SMS el día del pago a las 8:30 a. m. + push repetido hasta registrar el pago | El Worker corre una vez a las 8:00 y manda un push el día del pago | SMS programado en LabsMobile para las 8:30; push a las 8:30, 11:30, 2:30 y 5:30 p. m. hasta que registre, omita, pause o borre el gasto fijo |

| Pieza | Archivo | Qué hace hoy | Qué pasa |
|---|---|---|---|
| Contador del mes | `src/firebase/AgregarGasto.js` (`sumarUsoDeGasto`) | `{gastos: increment(1)}` | Acepta `{ fijo: true }` y suma también `fijos` |
| Pago de un fijo | `src/firebase/recurrentes.js` (`registrarPago`) | Lote gasto + uso + siguiente fecha | Marca `fijo: true`; tras registrar/omitir/pausar/borrar pide revisar el SMS programado |
| Datos del panel | `src/Hooks/useClientesAdmin.js` | Ya escucha TODA la colección `uso` pero guarda solo el mes actual | Devuelve además `fijos` (mes actual) e `historial` (todos los meses) |
| Cálculo de avisos | `src/functions/recurrencias.js` | `claveAviso` = `fecha:tipo` | El aviso «hoy» lleva turno: `fecha:hoy:0..3` |
| Emisor | `worker-recordatorios/src/recordatorios.js` | Cron 8:00, un push por persona | Dos crons; programa el SMS a las 8:00, repite el push «hoy» por turnos |
| API del Worker | `worker-recordatorios/src/api.js` | Solo `POST /clientes` | `POST /clientes` acepta `dias`; nuevo `POST /sms/revisar` (cancela el SMS programado) |

## 1. Lo verificado (6 nov 2026)

**LabsMobile, API JSON** — https://www.labsmobile.com/es/api-sms/versiones-api/http-rest-post-json (secciones `#send_sms_post` y `#scheduled_sendings`):

- Envío: `POST https://api.labsmobile.com/json/send`, autenticación HTTP Basic con `usuario:token` en base64 (usuario = correo de la cuenta; token = «Configuración API»).
- Cuerpo: `recipient: [{ msisdn }]` (E.164; el ejemplo oficial va sin `+`: `"12015550123"`), `message` (solo GSM 03.38 de 7 bits salvo `ucs2: 1`), `tpoa` (remitente: numérico ≤16 o alfanumérico ≤11; **«solo disponible en algunos países y operadores»**), `subid` (≤20 caracteres, propio u otorgado), `label` (≤255), `scheduled` (`"YYYY-MM-DD HH:MM:SS"` **en GMT**; sin él se envía ya), `test` (`1` = simula sin cobrar).
- Respuesta: `{ code, message, subid }`. HTTP 200 **también cuando rechaza**: solo `code === "0"` es aceptado (lección de ZF Manager, `enviarSMS.js`). Códigos: 0 ok, 21 mensaje vacío, 23 sin destinatarios, 27 caracteres inválidos, 28 `subid` largo, 30 error de envío, 35 sin créditos, 39 `scheduled` inválido, **41 «los programados no pueden ir en modo test»**, 51 faltan campos, 52 programados no encontrados. HTTP 401 credenciales, 402 sin créditos, 403 IP o política, 500 temporal.
- Programados: `POST https://api.labsmobile.com/json/scheduled` con `{ "cmd": "cancel" | "send", "subid": "<id>" }` (`"*"` = todos). Éxito `{"code":"0"}`; `{"code":"52"}` = no encontrado (ya salió o ya se canceló).
- **Confirmado por LabsMobile (respuesta al dueño, 6 nov 2026)**: para cancelar un envío programado pendiente se usa **el mismo `subid` que se asignó al programarlo**, con `POST https://api.labsmobile.com/json/scheduled` y cuerpo `{ "subid": "<el mismo>", "cmd": "cancel" }`. `"subid": "*"` cancela todos los pendientes de la cuenta: **nunca se usa** aquí (cancelaría los SMS de todos los clientes). Por eso `subidSms(uid, fecha)` es determinista: el Worker lo recalcula/lee de `ultimoSms` y cancela solo ese.

**Cloudflare Workers, plan Free** — https://developers.cloudflare.com/workers/platform/limits/ : 50 subrequests por ejecución, 5 Cron Triggers por cuenta, 10 ms de CPU por ejecución de cron. El Worker queda con 2 expresiones de cron.

**Colombia** es UTC-5 todo el año: 8:30 a. m. = 13:30 GMT.

## 2. Decisiones cerradas (no se cambian durante la ejecución)

| # | Decisión | Origen |
|---|---|---|
| D1 | Historial: pagos del plan (5 por página) **y** uso por mes (6 por página), paginados en el cliente con «Más recientes» / «Anteriores». Los datos ya llegan completos (pocos documentos por cliente): no hace falta índice nuevo. | Dueño + diseño |
| D2 | Barra partida: `uso.fijos` cuenta los pagos de gastos fijos del mes; variables = `gastos − fijos`. Un solo cupo (`limites.gastosMes`) para ambos, como hoy. El admin solo ve conteos, nunca gastos. Los meses anteriores al despliegue muestran 0 fijos (no se recuentan). | Dueño |
| D3 | Días de prueba: campo «Días de prueba» (1–90, vacío = 30) al crear un cliente en Prueba o al pasar uno a Prueba (nunca acorta su vencimiento); botón «Dar días de prueba» en la ficha que suma días a cualquier cliente, deja asiento de $0 en `pagosPlan` con referencia «Días de prueba (N)» y no cambia plan, límites ni estado. | Dueño |
| D4 | Push el día del pago: 8:30, 11:30, 14:30 y 17:30 (hora de Colombia), hasta que la persona registre, omita, pause o borre el gasto fijo. El aviso «3 días antes» se queda como hoy (una vez). A las 8:00 ya no sale el push del mismo día. | Dueño |
| D5 | SMS: lo recibe el cliente, una vez por día de pago, a las 8:30 a. m. El Worker lo **programa** en la corrida de las 8:00 con `scheduled = "<hoy> 13:30:00"` (GMT). Si la corrida de las 8:00 falla, la siguiente (8:30, 11:30…) lo envía de inmediato. | Dueño + documentación |
| D6 | Si la persona registra/omite/pausa/borra entre las 8:00 y las 8:30 y ya no le queda ningún fijo que venza hoy, la app pide al Worker (`POST /sms/revisar`, ID token) cancelar el SMS programado (`/json/scheduled` `cancel`). Solo el Worker tiene las credenciales. | Diseño |
| D7 | El celular lo escribe el propio cliente en «Gastos fijos» (tarjeta «Recordatorio por SMS») con un interruptor «Recordarme por SMS» (opt-in, nace apagado). Solo celulares de Colombia (`+57` + 10 dígitos que empiezan por 3). Se guarda en `usuarios/{uid}` (`celular`, `smsActivo`). El dueño no tiene los números. | Dueño («yo no tengo número») + diseño |
| D8 | Remitente (`tpoa`) = nombre del cliente (`clientes/{uid}.nombre`), solo letras y números, máx. 11; sin nombre, «Finanzas». LabsMobile avisa que el remitente alfanumérico no funciona en todos los operadores. | Dueño |
| D9 | Texto del SMS en GSM-7 (sin á í ó ú; ñ sí), máx. 160 caracteres. Las descripciones de los pagos solo van si la persona activó «Mostrar el nombre del pago en el aviso» (`detalleEnAviso`), igual que el push. | Diseño |
| D10 | Solo reciben SMS los clientes con plan vigente (`puedeEscribir`), de cualquier plan. Tope de 8 SMS por ejecución y 30 push (presupuesto de 50 subrequests). | Diseño |
| D11 | Credenciales: `LABS_MOBILE_USER` y `LABS_MOBILE_TOKEN` (mismos nombres que ZF Manager) como **secretos del Worker** (`wrangler secret put`), nunca en el repo ni en `.env`. No van en `secrets.required`: sin ellos el Worker sigue funcionando y omite los SMS. | Dueño |
| D12 | Orden de despliegue: reglas → Worker → Hosting. Las reglas nuevas aceptan la app vieja; la app nueva necesita las reglas nuevas. | Diseño |

**Interfaz (ui-ux-pro-max / web-design-guidelines)**: se adopta objetivo táctil ≥ 44 px (botones de página 2,75 rem), estado no solo por color (la barra lleva leyenda y `aria-valuetext`), `aria-live` en el número de página, foco visible, `prefers-reduced-motion`, campos ≥ 16 px (`Entrada` ya usa `theme.letraCampo`). **No** se adoptan vidrio, degradados ni paletas nuevas: se usan `theme.colorPrimario` (#5B69E2) para variables y `#0F766E` para fijos (≥ 3:1 sobre `theme.grisClaro`).

## 3. Multi-agentes

| Fase | Agentes | Modo |
|---|---|---|
| 0 | principal | uno |
| 1 | `firebase:firestore-rules-author` (solo `firestore.rules`) → principal (`scripts/probar-reglas.js`) | en serie |
| 2 | `logica` | uno |
| 3 | `datos-admin` → `ui-admin` | en serie (la UI importa lo de datos) |
| 4 | `worker` | uno |
| 5 | `datos-sms` → `ui-sms` | en serie |
| 6 | principal (E2E y docs) → `revisor` (solo lectura) | en serie |

El agente principal orquesta, revisa con `git diff --stat`, corre las pruebas y hace los commits. Los agentes **no** hacen commit,
push ni corren Playwright. Prompt para cada agente (cambia `<…>`):

```text
Eres el agente <nombre> de docs/PLAN_ADMIN_PRUEBA_SMS.md. Haz SOLO la Fase <N>, sección(es) <N.x…>, y toca SOLO estos archivos: <lista>.
Copia el código y los textos del plan tal cual. Si algo del repo no coincide con el plan, para y repórtalo. No hagas commit ni corras Playwright.
Al terminar, corre <comando de pruebas de la fase> y responde: archivos tocados, resultado de las pruebas, dudas.
```

Prompt del `revisor` (Fase 6): «Solo lectura. Compara `git diff master...HEAD` con docs/PLAN_ADMIN_PRUEBA_SMS.md sección por sección. Reporta: código que difiera del plan, textos visibles distintos, archivos tocados fuera de las listas, `undefined` que pueda llegar a Firestore, credenciales o `.env` en el diff. No edites nada.»

## 4. Reglas para todas las fases

- Rama `feature/admin-prueba-sms` creada desde `master` al día. Un commit por fase con el mensaje exacto, **sin** `Co-Authored-By` ni otro trailer.
- `git add` solo con las rutas de la fase. Nunca `git add -A` ni `git add .`. Revisa `git status` antes.
- Prohibido: tocar `.env*`, `.dev.vars`, `worker-recordatorios/.wrangler/`; escribir credenciales; `reset --hard`, `--force`, `branch -D`, push, merge; desplegar reglas, Worker o Hosting (lo hace el dueño); dependencias nuevas.
- Lee código con `codegraph_explore` antes que Read; `codegraph sync` al cerrar cada fase con código.
- Mismo error 3 veces → para y reporta qué probaste.
- Nada `undefined` hacia Firestore: los campos opcionales se añaden solo si tienen valor (el plan ya lo hace así).
- `src/functions/*.js` lo importa también el Worker: sin dependencias de React ni Firebase en esos archivos.
- Firebase CLI solo está instalado en Node v22.19.0 de nvm: todo comando que use el emulador (`npm run test:reglas`, `npm run e2e`, `npm run test:emulador` del Worker) se corre con `PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH` delante. No instales firebase-tools.
- Verificación de la app: `CI=true npm test -- --watchAll=false` y `CI=true npm run build` (con `CI=true` un warning de ESLint es error).
- Formato del reporte en cada PARAR AQUÍ: qué hiciste, qué comprobaste (con cifras), qué falló, qué debe revisar el dueño.

| Fase | Skills a cargar |
|---|---|
| 1 | `firebase:firestore-rules-creation` (el agente de reglas ya la trae) |
| 2, 4 | `javascript-testing-patterns` |
| 3, 5 | `web-design-guidelines` (solo para revisar accesibilidad de lo copiado; no cambies el diseño) |
| 6 | `e2e-testing-patterns` |

---

## Fase 0 · Línea base

1. `git checkout master && git pull --ff-only && git checkout -b feature/admin-prueba-sms`.
2. `npm ci` y `cd worker-recordatorios && npm ci && cd ..`.
3. Corre y anota las cifras: `CI=true npm test -- --watchAll=false` (línea base comprobada: 29 suites, **252** pruebas), `cd worker-recordatorios && npm test` (30 pruebas: api 10, planes 5, recordatorios 13, emulador 2 omitidas sin emulador), `PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH npm run test:reglas` (**101 correctos, 0 fallidos**). Si algo ya falla, **para** y di qué archivo.
4. Copia este archivo tal cual: `mkdir -p docs && cp /home/esteban/.claude/plans/mejoras-1-historial-de-fizzy-dahl.md docs/PLAN_ADMIN_PRUEBA_SMS.md`.
5. En `CLAUDE.md`, justo antes de la sección `## Diseño`, añade esta sección tal cual (el dueño pidió dejar documentada la API para no volver a preguntarla):

```markdown
**SMS (LabsMobile)** — los envía solo el Worker (`worker-recordatorios/src/sms.js`); textos y validación compartidos en `src/functions/sms.js`. Documentación oficial: https://www.labsmobile.com/es/api-sms/versiones-api/http-rest-post-json (`#send_sms_post`, `#scheduled_sendings`). Envío: `POST https://api.labsmobile.com/json/send`, HTTP Basic `usuario:token` en base64 (usuario = correo de la cuenta; token = «Configuración API»), cuerpo `{message, tpoa, recipient: [{msisdn}], subid (≤20), label, scheduled}`; `msisdn` en E.164 sin `+` (`573001234567`); `scheduled` = `"AAAA-MM-DD HH:MM:SS"` **en GMT** (8:30 Colombia = `13:30:00`); `tpoa` alfanumérico ≤11 (no todos los operadores lo respetan). Programados: `POST /json/scheduled` `{cmd: "cancel"|"send", subid}`; para cancelar se usa **el mismo `subid` que se puso al programar** (confirmado por LabsMobile, 6 nov 2026); `"*"` cancela todos los pendientes de la cuenta (nunca usarlo en el Worker); code 52 = no encontrado. ⚠️ Responde HTTP 200 **también al rechazar**: solo `code === "0"` es aceptado, y la marca de idempotencia (`clientes/{uid}.ultimoSms`) se escribe solo si no hubo excepción (lección de ZF Manager). Códigos: 27 caracteres inválidos, 35 sin créditos, 39 fecha inválida, 41 programados no admiten `test: 1`. Texto en GSM-7 (sin á í ó ú; ñ sí) o el SMS cuesta el doble. Credenciales: secretos del Worker `LABS_MOBILE_USER` y `LABS_MOBILE_TOKEN` (`wrangler secret put`; en local `.dev.vars`), **nunca** en el repo ni en `.env`. Celular y opt-in en `usuarios/{uid}` (`celular` `+573…`, `smsActivo`). Plan de la función: `docs/PLAN_ADMIN_PRUEBA_SMS.md`.
```

6. `git add docs/PLAN_ADMIN_PRUEBA_SMS.md CLAUDE.md` y commit: `Plan: historial del cliente, barra con fijos, días de prueba y SMS`.

---

## Fase 1 · Reglas de Firestore

**Agente `firebase:firestore-rules-author`.** Archivo: `firestore.rules`. Pásale este bloque tal cual y pídele que no cambie nada más.

**1.1 `uso`: campo `fijos`.** Antes de `match /uso/{usoId} {` añade:

```
    // `fijos` (opcional) cuenta cuántos de los gastos del mes son pagos de gastos fijos (id «rec_…»). Solo sube de 1 en 1 junto
    // con `gastos` y nunca pasa de `gastos`. Lo usa el panel del super admin para partir la barra del mes (solo conteos).
    function fijosValidos(nuevo, antes) {
      return nuevo.get('fijos', 0) is int
        && (nuevo.get('fijos', 0) == antes || nuevo.get('fijos', 0) == antes + 1)
        && nuevo.get('fijos', 0) <= nuevo.gastos;
    }
```

En `allow create` de `uso` cambia `request.resource.data.keys().hasOnly(['gastos', 'uidUsuario'])` por
`request.resource.data.keys().hasOnly(['gastos', 'uidUsuario', 'fijos'])` y añade al final (antes del `;`)
`&& fijosValidos(request.resource.data, 0)`. En `allow update` haz el mismo cambio de `hasOnly` y añade
`&& fijosValidos(request.resource.data, resource.data.get('fijos', 0))`.

**1.2 `usuarios/{uid}`: celular y SMS.** Reemplaza la línea
`&& request.resource.data.keys().hasOnly(['zona', 'detalleEnAviso', 'actualizado'])` por
`&& request.resource.data.keys().hasOnly(['zona', 'detalleEnAviso', 'actualizado', 'celular', 'smsActivo'])` y, después de
`&& request.resource.data.detalleEnAviso is bool`, añade:

```
                            // Celular de Colombia para el SMS del día del pago (lo escribe la persona; opt-in con smsActivo)
                            && (!('celular' in request.resource.data) || (request.resource.data.celular is string
                                && request.resource.data.celular.matches('^[+]573[0-9]{9}$')))
                            && (!('smsActivo' in request.resource.data) || request.resource.data.smsActivo is bool)
```

(El `hasAll` de `usuarios` no cambia.)

**1.3 `clientes/{uid}`: `ultimoSms`.** En `clienteValido`, en la lista de `hasOnly`, añade `'ultimoSms'` después de `'ultimoAvisoPlan'`, y
después de `&& (!('ultimoAvisoPlan' in d) || d.ultimoAvisoPlan is string)` añade:

```
        // `ultimoSms` («AAAA-MM-DD|subid» o «AAAA-MM-DD|cancelado») lo escribe solo el Worker; aquí solo se permite que exista
        && (!('ultimoSms' in d) || d.ultimoSms is string)
```

**1.4 Pruebas `scripts/probar-reglas.js`** (agente principal).

a) En el caso `"registrar pago: gasto con id fijo + avance de fecha en un batch"` cambia
`{ gastos: increment(1), uidUsuario: "ana" }` por `{ gastos: increment(1), fijos: increment(1), uidUsuario: "ana" }`.

b) Después del caso `"NO leer el contador de otra persona; el dueño y el admin sí"` añade:

```js
  await caso("el contador de fijos sube de 1 en 1 junto con el de gastos", async () => {
    const lote = writeBatch(ana);
    lote.set(doc(ana, "gastos/rec_f1_2026-11-10"), gasto("ana"));
    lote.set(doc(ana, "uso", claveUso("ana")), { gastos: increment(1), fijos: increment(1), uidUsuario: "ana" }, { merge: true });
    await assertSucceeds(lote.commit());
  });
  await caso("NO saltar el contador de fijos ni pasarlo por encima de gastos", async () => {
    const lote = writeBatch(ana);
    lote.set(doc(ana, "gastos/rec_f2_2026-11-10"), gasto("ana"));
    lote.set(doc(ana, "uso", claveUso("ana")), { gastos: increment(1), fijos: increment(2), uidUsuario: "ana" }, { merge: true });
    await assertFails(lote.commit());
    await assertFails(setDoc(doc(ana, "uso", claveUso("ana")), { gastos: 1, fijos: 2, uidUsuario: "ana" }));
  });
```

c) Después del caso `"dueño guarda su perfil"` añade:

```js
  await caso("dueño guarda celular y SMS; NO un celular inválido ni smsActivo no booleano", async () => {
    await assertSucceeds(setDoc(doc(ana, "usuarios/ana"), perfil({ celular: "+573001234567", smsActivo: true })));
    await assertFails(setDoc(doc(ana, "usuarios/ana"), perfil({ celular: "3001234567" })));
    await assertFails(setDoc(doc(ana, "usuarios/ana"), perfil({ celular: "+5730012345" })));
    await assertFails(setDoc(doc(ana, "usuarios/ana"), perfil({ smsActivo: "si" })));
    await assertFails(setDoc(doc(beto, "usuarios/ana"), perfil({ celular: "+573001234567" })));
  });
```

d) En el bloque «Planes de clientes y super admin», después del primer caso, añade:

```js
  await caso("un plan con ultimoSms (lo escribe el Worker) se puede seguir editando; ultimoSms debe ser texto", async () => {
    await env.withSecurityRulesDisabled(async (c) => updateDoc(doc(c.firestore(), "clientes/ana"), { ultimoSms: "2026-11-10|fana20261110" }));
    await assertSucceeds(updateDoc(doc(root, "clientes/ana"), { notas: "con SMS", actualizado: serverTimestamp() }));
    await assertFails(updateDoc(doc(root, "clientes/ana"), { ultimoSms: 5, actualizado: serverTimestamp() }));
  });
```

Si en el archivo el administrador no se llama `root` o el entorno no se llama `env`, **para** y reporta los nombres reales.

**1.5 Comprobar y cerrar.** `PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH npm run test:reglas` → 101 + 4 = **105 correctos**, 0 fallidos. Commit (`git add firestore.rules scripts/probar-reglas.js`):
`Reglas: contador de fijos, celular para SMS y marca ultimoSms`

---

## Fase 2 · Lógica pura compartida

**Agente `logica`.** Archivos: `src/functions/planes.js`, `src/functions/recurrencias.js`, `src/functions/sms.js` (nuevo),
`src/functions/paginar.js` (nuevo), `src/__tests__/planes.test.js`, `src/__tests__/recurrencias.test.js`,
`src/__tests__/sms.test.js` (nuevo), `src/__tests__/paginar.test.js` (nuevo).

**2.1 `src/functions/planes.js`.** Después de `export const DIAS_AVISO_VENCIMIENTO = 7;` añade:

```js
//Días de prueba que el super admin puede dar (D3 del plan). Vacío = los del plan Prueba.
export const DIAS_PRUEBA_MIN = 1;
export const DIAS_PRUEBA_MAX = 90;

//Texto del campo «Días de prueba» → número de días, o null si no es válido. Vacío = PLANES.prueba.dias (30).
export const diasDePrueba = (texto) => {
  const limpio = String(texto ?? "").trim();
  if (limpio === "") return PLANES.prueba.dias;
  const n = Number(limpio);
  return Number.isInteger(n) && n >= DIAS_PRUEBA_MIN && n <= DIAS_PRUEBA_MAX ? n : null;
};
```

**2.2 `src/functions/recurrencias.js`.**

a) Después de `export const ZONA_POR_DEFECTO = "America/Bogota";` añade:

```js
//El día del pago el aviso push se repite por turnos (8:30, 11:30, 14:30 y 17:30 en Colombia, UTC-5 sin horario de verano)
//hasta que la persona lo registre. Deben coincidir con los crons de worker-recordatorios/wrangler.jsonc.
export const TURNOS_HOY = 4;
const PRIMER_TURNO_MIN = 8 * 60 + 30;
const MINUTOS_ENTRE_TURNOS = 180;

//Turno de hoy según la hora de Colombia: null antes de las 8:30; 0, 1, 2 o 3 después (3 hasta medianoche)
export const turnoDelDia = (ahora = new Date()) => {
  const minutos = (ahora.getUTCHours() * 60 + ahora.getUTCMinutes() - 300 + 1440) % 1440;
  if (minutos < PRIMER_TURNO_MIN) return null;
  return Math.min(TURNOS_HOY - 1, Math.floor((minutos - PRIMER_TURNO_MIN) / MINUTOS_ENTRE_TURNOS));
};
```

b) Reemplaza las funciones `claveAviso` y `avisoPendiente` (y el comentario que las acompaña) por:

```js
//«3 días antes» se avisa una vez («fecha:antes»); el día del pago, una vez por turno («fecha:hoy:0» … «fecha:hoy:3»)
export const claveAviso = (rec, tipo, turno = 0) => (tipo === "hoy" ? `${rec.proximaFecha}:hoy:${turno}` : `${rec.proximaFecha}:${tipo}`);

//Aviso pendiente de enviar ahora (null si no toca o ya se envió). Con turno null (antes de las 8:30) no hay aviso «hoy».
export const avisoPendiente = (rec, hoy, turno = 0) => {
  const tipo = tipoAviso(rec, hoy);
  if (!tipo || (tipo === "hoy" && turno === null)) return null;
  return rec.ultimoAviso !== claveAviso(rec, tipo, turno) ? tipo : null;
};
```

Por qué `turno = 0` por defecto: las pruebas y llamadas que ya existen siguen valiendo sin cambios. Al desplegar, un pago que ya tenía
`ultimoAviso = "fecha:hoy"` recibirá un aviso más ese día: es aceptado.

**2.3 `src/functions/sms.js` (nuevo), completo:**

```js
//Textos y validaciones del SMS de recordatorio del día del pago. Módulo puro y sin dependencias: lo usan la app (validar el
//celular, saber si toca pedir cancelación) y el Worker (armar el SMS). Lección de ZF Manager: un SMS cuesta 1 crédito por cada
//160 caracteres GSM-7, y una sola «á», «í», «ó» o «ú» lo pasa a UCS-2 (70 caracteres, el doble de créditos). Por eso todo texto
//pasa por aGsm7. La ñ sí cabe en GSM-7.

export const CELULAR_VALIDO = /^\+573[0-9]{9}$/;
export const LARGO_SMS = 160;
export const URL_SMS = "finanzas.zfmanager.com/recurrentes";

//Celular de Colombia escrito como sea («300 123 4567», «573001234567», «+57 300…») → «+573001234567»; si no, null
export const normalizarCelular = (texto) => {
  const digitos = String(texto || "").replace(/\D/g, "");
  const local = digitos.length === 12 && digitos.startsWith("57") ? digitos.slice(2) : digitos;
  return /^3[0-9]{9}$/.test(local) ? `+57${local}` : null;
};

//Quita tildes (conserva ñ y Ñ) y todo lo que no sea letra, número, espacio o puntuación básica
export const aGsm7 = (texto) =>
  String(texto || "")
    .replace(/ñ/g, "")
    .replace(/Ñ/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(//g, "ñ")
    .replace(//g, "Ñ")
    .replace(/[^A-Za-z0-9ñÑ .,:;!?()+/-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

//Texto del SMS (máx. 160). Con `conDetalle` lleva las descripciones de los pagos (recortadas con «...» si no caben).
export const textoSms = (pagos, conDetalle) => {
  const n = pagos.length;
  const cola = ` Registra${n === 1 ? "lo" : "los"} en ${URL_SMS}`;
  if (conDetalle) {
    const nombres = aGsm7(pagos.map((p) => p.descripcion).join(", "));
    const cabeza = n === 1 ? "Hoy vence tu gasto fijo " : "Hoy vencen tus gastos fijos: ";
    const espacio = LARGO_SMS - cabeza.length - cola.length - 1;
    if (nombres && espacio >= 6) {
      const corto = nombres.length > espacio ? `${nombres.slice(0, espacio - 3).trim()}...` : nombres;
      return `${cabeza}${corto}.${cola}`;
    }
  }
  return n === 1 ? `Hoy vence 1 gasto fijo en Finanzas.${cola}` : `Hoy vencen ${n} gastos fijos en Finanzas.${cola}`;
};

//Remitente (tpoa): el nombre del cliente, solo letras y números, máx. 11 (estándar SMS). Sin nombre: «Finanzas».
export const remitenteSms = (nombre) => {
  const limpio = aGsm7(nombre).replace(/ñ/g, "n").replace(/Ñ/g, "N").replace(/[^A-Za-z0-9]/g, "");
  return limpio.slice(0, 11) || "Finanzas";
};

//Identificador del SMS en LabsMobile (máx. 20): «f» + 11 primeros caracteres del uid + fecha sin guiones. Fijo por persona
//y día, así el Worker lo puede recalcular para cancelarlo.
export const subidSms = (uid, fecha) => `f${String(uid).slice(0, 11)}${fecha.replace(/-/g, "")}`;

//¿Puede haber un SMS programado sin salir todavía? Entre las 8:00 y las 8:30 de Colombia (lo programa el cron de las 8:00)
export const enVentanaDeCancelacion = (ahora = new Date()) => {
  const minutos = (ahora.getUTCHours() * 60 + ahora.getUTCMinutes() - 300 + 1440) % 1440;
  return minutos >= 8 * 60 && minutos < 8 * 60 + 30;
};
```

**2.4 `src/functions/paginar.js` (nuevo), completo:**

```js
//Página `pagina` (desde 1) de `lista`, de `tam` elementos. La página se ajusta al rango. Devuelve {elementos, pagina, paginas}.
export const paginar = (lista, pagina, tam) => {
  const paginas = Math.max(1, Math.ceil(lista.length / tam));
  const actual = Math.min(Math.max(1, pagina), paginas);
  return { elementos: lista.slice((actual - 1) * tam, actual * tam), pagina: actual, paginas };
};
```

**2.5 Pruebas.**

`src/__tests__/planes.test.js` — añade al final:

```js
describe("días de prueba", () => {
  test("vacío = 30; entero de 1 a 90; lo demás es inválido", () => {
    expect(diasDePrueba("")).toBe(30);
    expect(diasDePrueba("  ")).toBe(30);
    expect(diasDePrueba("7")).toBe(7);
    expect(diasDePrueba("90")).toBe(90);
    for (const malo of ["0", "91", "2.5", "-3", "siete"]) expect(diasDePrueba(malo)).toBeNull();
  });
});
```

y añade `diasDePrueba` al `import` de `../functions/planes` que ya tiene el archivo.

`src/__tests__/recurrencias.test.js` — añade `turnoDelDia` al `import` existente y al final:

```js
describe("turnos del aviso del día del pago", () => {
  test("null antes de las 8:30 de Colombia; 0, 1, 2 y 3 en cada turno; 3 hasta medianoche", () => {
    expect(turnoDelDia(new Date("2026-11-10T13:00:00Z"))).toBeNull(); //8:00
    expect(turnoDelDia(new Date("2026-11-10T13:30:00Z"))).toBe(0); //8:30
    expect(turnoDelDia(new Date("2026-11-10T16:30:00Z"))).toBe(1); //11:30
    expect(turnoDelDia(new Date("2026-11-10T19:30:00Z"))).toBe(2); //14:30
    expect(turnoDelDia(new Date("2026-11-10T22:30:00Z"))).toBe(3); //17:30
    expect(turnoDelDia(new Date("2026-11-11T04:59:00Z"))).toBe(3); //23:59
    expect(turnoDelDia(new Date("2026-11-11T05:00:00Z"))).toBeNull(); //00:00 del día siguiente
  });
  test("el aviso «hoy» se repite una vez por turno y no sale con turno null", () => {
    expect(claveAviso(rec(), "hoy", 2)).toBe("2026-11-10:hoy:2");
    expect(claveAviso(rec(), "antes", 2)).toBe("2026-11-10:antes");
    expect(avisoPendiente(rec(), "2026-11-10", null)).toBeNull();
    expect(avisoPendiente(rec({ ultimoAviso: "2026-11-10:hoy:0" }), "2026-11-10", 1)).toBe("hoy");
    expect(avisoPendiente(rec({ ultimoAviso: "2026-11-10:hoy:1" }), "2026-11-10", 1)).toBeNull();
    expect(avisoPendiente(rec(), "2026-11-07", null)).toBe("antes");
  });
});
```

(`rec()` ya existe en ese archivo y su `proximaFecha` es `"2026-11-10"`; si no, **para**.)

`src/__tests__/sms.test.js` (nuevo):

```js
import { normalizarCelular, aGsm7, textoSms, remitenteSms, subidSms, enVentanaDeCancelacion, LARGO_SMS } from "../functions/sms";

describe("SMS de recordatorio", () => {
  test("normaliza celulares de Colombia y rechaza lo demás", () => {
    expect(normalizarCelular("300 123 4567")).toBe("+573001234567");
    expect(normalizarCelular("+57 300-123-4567")).toBe("+573001234567");
    expect(normalizarCelular("573001234567")).toBe("+573001234567");
    for (const malo of ["", "300123456", "6011234567", "+1 300 123 4567", null]) expect(normalizarCelular(malo)).toBeNull();
  });
  test("GSM-7: quita tildes y emojis, conserva la ñ", () => {
    expect(aGsm7("Pensión Año 🎉 Ñandú")).toBe("Pension Año Ñandu");
  });
  test("texto genérico, con detalle y recortado; nunca pasa de 160", () => {
    expect(textoSms([{ descripcion: "Arriendo" }], false)).toBe("Hoy vence 1 gasto fijo en Finanzas. Registralo en finanzas.zfmanager.com/recurrentes");
    expect(textoSms([{ descripcion: "a" }, { descripcion: "b" }], false)).toBe("Hoy vencen 2 gastos fijos en Finanzas. Registralos en finanzas.zfmanager.com/recurrentes");
    expect(textoSms([{ descripcion: "Pensión" }], true)).toBe("Hoy vence tu gasto fijo Pension. Registralo en finanzas.zfmanager.com/recurrentes");
    const largo = textoSms([{ descripcion: "x".repeat(200) }, { descripcion: "y" }], true);
    expect(largo.length).toBeLessThanOrEqual(LARGO_SMS);
    expect(largo).toContain("...");
  });
  test("remitente con el nombre del cliente (11 letras o números) o «Finanzas»", () => {
    expect(remitenteSms("Esteban Páez")).toBe("EstebanPaez");
    expect(remitenteSms("María José Rodríguez")).toBe("MariaJoseRo");
    expect(remitenteSms("")).toBe("Finanzas");
    expect(remitenteSms(undefined)).toBe("Finanzas");
  });
  test("subid de 20 caracteres como máximo y ventana de cancelación de 8:00 a 8:30", () => {
    expect(subidSms("abcdefghijklmnopqrstuvwxyz12", "2026-11-10")).toBe("fabcdefghijk20261110");
    expect(subidSms("abcdefghijklmnopqrstuvwxyz12", "2026-11-10").length).toBe(20);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T12:59:00Z"))).toBe(false);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T13:00:00Z"))).toBe(true);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T13:29:00Z"))).toBe(true);
    expect(enVentanaDeCancelacion(new Date("2026-11-10T13:30:00Z"))).toBe(false);
  });
});
```

`src/__tests__/paginar.test.js` (nuevo):

```js
import { paginar } from "../functions/paginar";

test("pagina de 5 en 5 y ajusta la página al rango", () => {
  const lista = [1, 2, 3, 4, 5, 6, 7];
  expect(paginar(lista, 1, 5)).toEqual({ elementos: [1, 2, 3, 4, 5], pagina: 1, paginas: 2 });
  expect(paginar(lista, 2, 5)).toEqual({ elementos: [6, 7], pagina: 2, paginas: 2 });
  expect(paginar(lista, 9, 5).pagina).toBe(2);
  expect(paginar([], 1, 5)).toEqual({ elementos: [], pagina: 1, paginas: 1 });
});
```

**2.6 Comprobar y cerrar.** `CI=true npm test -- --watchAll=false` (línea base + 9 casos nuevos, 0 fallos) y `cd worker-recordatorios && npm test` (sigue en 30, sin fallos: el Worker usa estas funciones). Commit (`git add src/functions/planes.js src/functions/recurrencias.js src/functions/sms.js src/functions/paginar.js src/__tests__/planes.test.js src/__tests__/recurrencias.test.js src/__tests__/sms.test.js src/__tests__/paginar.test.js`):
`Lógica compartida: días de prueba, turnos del aviso, textos de SMS y paginación`

---

## Fase 3 · Panel del super admin (puntos 1, 2 y 3)

### 3A · Agente `datos-admin`

Archivos: `src/firebase/AgregarGasto.js`, `src/firebase/recurrentes.js` (solo 3A.2), `src/__tests__/recurrentes.test.js`,
`src/Hooks/useClientesAdmin.js`, `src/firebase/clientes.js`, `src/firebase/crearCliente.js`, `worker-recordatorios/src/api.js`,
`worker-recordatorios/test/api.test.js`.

**3A.1 `src/firebase/AgregarGasto.js`.** Reemplaza la línea `export const sumarUsoDeGasto = …` por:

```js
//Con `fijo: true` (pago de un gasto fijo, id «rec_…») suma también `fijos`: el panel del super admin parte la barra del mes
export const sumarUsoDeGasto = (lote, uid, { fijo = false } = {}) =>
  lote.set(doc(db, "uso", claveUso(uid)), fijo ? { gastos: increment(1), fijos: increment(1), uidUsuario: uid } : { gastos: increment(1), uidUsuario: uid }, { merge: true });
```

**3A.2 `src/firebase/recurrentes.js`.** En `registrarPago` cambia `sumarUsoDeGasto(lote, auth.currentUser.uid);` por
`sumarUsoDeGasto(lote, auth.currentUser.uid, { fijo: true });` (deja el comentario de la línea). Nada más en esta fase.

En `src/__tests__/recurrentes.test.js` cambia la expectativa
`{ gastos: { incremento: 1 }, uidUsuario: "ana" }` (la del contador de `registrarPago`) por
`{ gastos: { incremento: 1 }, fijos: { incremento: 1 }, uidUsuario: "ana" }`.

**3A.3 `src/Hooks/useClientesAdmin.js`.** Reemplaza `useClientesAdmin` completo (deja `usePagosCliente` igual):

```js
//Para el panel del super admin: todos los clientes y, de la colección `uso` (que ya se escucha entera), el total del mes,
//los pagos de gastos fijos del mes y el historial de todos los meses de cada cliente. Las reglas solo dejan leer esto al admin.
export const useClientesAdmin = (activo) => {
  const [clientes, cambiarClientes] = useState(null);
  const [usos, cambiarUsos] = useState({});
  const [fijos, cambiarFijos] = useState({});
  const [historial, cambiarHistorial] = useState({});
  const [error, cambiarError] = useState(false);

  useEffect(() => {
    if (!activo) return undefined;
    const alFallar = (e) => {
      console.log(e);
      cambiarError(true);
    };
    const quitarClientes = onSnapshot(
      collection(db, "clientes"),
      (s) => {
        cambiarError(false);
        cambiarClientes(s.docs.map((d) => ({ uid: d.id, ...d.data() })));
      },
      alFallar
    );
    const quitarUso = onSnapshot(
      collection(db, "uso"),
      (s) => {
        const mapa = {};
        const mapaFijos = {};
        const meses = {};
        s.docs.forEach((d) => {
          const { uidUsuario, gastos = 0, fijos: deFijos = 0 } = d.data();
          const partes = d.id.split("_");
          const anio = Number(partes[partes.length - 2]);
          const mes = Number(partes[partes.length - 1]);
          if (!uidUsuario || !Number.isInteger(anio) || !Number.isInteger(mes)) return;
          if (d.id === claveUso(uidUsuario)) {
            mapa[uidUsuario] = gastos;
            mapaFijos[uidUsuario] = deFijos;
          }
          if (!meses[uidUsuario]) meses[uidUsuario] = [];
          meses[uidUsuario].push({ anio, mes, gastos, fijos: deFijos });
        });
        Object.values(meses).forEach((lista) => lista.sort((a, b) => b.anio - a.anio || b.mes - a.mes));
        cambiarUsos(mapa);
        cambiarFijos(mapaFijos);
        cambiarHistorial(meses);
      },
      alFallar
    );
    return () => {
      quitarClientes();
      quitarUso();
    };
  }, [activo]);

  return { clientes, usos, fijos, historial, error };
};
```

Cambia también el comentario de `usePagosCliente` a: `//Pagos de un cliente, todos (más recientes primero); la ficha los pagina. Se ordena aquí para no exigir un índice compuesto.`

**3A.4 `src/firebase/clientes.js`.** Al final añade:

```js
//Días de prueba (cortesía) sin cobro: asiento de $0 en `pagosPlan` + vencimiento extendido, en un lote. No cambia plan, límites
//ni estado (un suspendido sigue suspendido). Nunca acorta: nuevoVencimiento parte del mayor entre el vencimiento actual y hoy.
export const darDiasPrueba = (cliente, dias, ahora = Date.now()) => {
  const venceAntes = cliente.vence && cliente.vence.toMillis ? cliente.vence.toMillis() : Number(cliente.vence) || 0;
  const venceDespues = nuevoVencimiento(venceAntes, dias, ahora);
  const lote = writeBatch(db);
  const asiento = {
    uidCliente: cliente.uid,
    correo: cliente.correo,
    plan: cliente.plan,
    monto: 0,
    referencia: `Días de prueba (${dias})`,
    fechaPago: aTimestamp(ahora),
    venceDespues: aTimestamp(venceDespues),
    creado: serverTimestamp(),
  };
  if (venceAntes) asiento.venceAntes = aTimestamp(venceAntes);
  lote.set(doc(collection(db, "pagosPlan")), asiento);
  lote.update(doc(db, "clientes", cliente.uid), { vence: aTimestamp(venceDespues), actualizado: serverTimestamp() });
  return lote.commit();
};
```

**3A.5 `src/firebase/crearCliente.js`.** En `MENSAJES` añade `"dias-invalidos": "Los días de prueba deben ser un número entero entre 1 y 90.",`.
Cambia la firma a `export const crearClienteConAcceso = async ({ correo, nombre, plan, notas, dias }) => {` y el cuerpo del
`fetch` a `body: JSON.stringify({ correo, nombre, plan, notas, ...(dias ? { dias } : {}) }),`.

**3A.6 `worker-recordatorios/src/api.js`.** Cambia el import de planes a
`import { PLANES, limitesDePlan, nuevoVencimiento, DIAS_PRUEBA_MIN, DIAS_PRUEBA_MAX } from "../../src/functions/planes.js";`.
En `validarNuevoCliente` reemplaza la última línea (`return { datos: … };`) por:

```js
  //Días de prueba (solo con plan Prueba): entero de 1 a 90. Sin el campo, los del plan (30).
  let dias;
  if (cuerpo.dias !== undefined && cuerpo.dias !== null) {
    if (cuerpo.plan !== "prueba" || !Number.isInteger(cuerpo.dias) || cuerpo.dias < DIAS_PRUEBA_MIN || cuerpo.dias > DIAS_PRUEBA_MAX) return { error: "dias-invalidos" };
    dias = cuerpo.dias;
  }
  return { datos: { correo, plan: cuerpo.plan, nombre, notas, ...(dias ? { dias } : {}) } };
```

y en el paso 4 cambia `nuevoVencimiento(null, plan.dias, ahora.getTime())` por `nuevoVencimiento(null, datos.dias || plan.dias, ahora.getTime())`.

En `worker-recordatorios/test/api.test.js`, después del test `"validarNuevoCliente normaliza el correo y rechaza datos inválidos"`, añade:

```js
test("validarNuevoCliente acepta días de prueba solo con plan Prueba y entre 1 y 90", () => {
  assert.equal(validarNuevoCliente({ ...VALIDO, plan: "prueba", dias: 7 }).datos.dias, 7);
  assert.equal(validarNuevoCliente({ ...VALIDO, plan: "prueba" }).datos.dias, undefined);
  for (const dias of [0, 91, 2.5, "7"]) assert.equal(validarNuevoCliente({ ...VALIDO, plan: "prueba", dias }).error, "dias-invalidos");
  assert.equal(validarNuevoCliente({ ...VALIDO, plan: "basico", dias: 7 }).error, "dias-invalidos");
});
```

Comprobar: `CI=true npm test -- --watchAll=false` y `cd worker-recordatorios && npm test` (31).

### 3B · Agente `ui-admin`

Archivos: `src/components/admin/elementos.jsx`, `src/components/admin/HojaCliente.jsx`, `src/components/admin/HojaPlanCliente.jsx`,
`src/components/admin/HojaDiasPrueba.jsx` (nuevo), `src/components/paginas/PaginaAdmin.jsx`.

**3B.1 `src/components/admin/elementos.jsx`.** Después del componente `Medidor` (antes de `fechaCorta`) añade:

```jsx
//Colores de la barra partida (≥ 3:1 sobre la pista gris, WCAG 1.4.11). El nivel (80 %, 100 %) se avisa en el número.
export const COLOR_VARIABLES = theme.colorPrimario;
export const COLOR_FIJOS = "#0F766E";
const TEXTO_NIVEL = { ok: theme.tintaSuave, aviso: "#93370D", limite: "#B42318" };

const PistaPartida = styled(Pista)`
  display: flex;
`;

const Parte = styled.div`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color};
  transform-origin: left;
  animation: ${llenar} 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Leyenda = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  color: ${theme.tintaSuave};

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  i {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }

  b {
    color: ${theme.tinta};
    font-variant-numeric: tabular-nums;
  }
`;

//Barra del mes partida: gastos variables + pagos de gastos fijos frente al cupo mensual (un solo cupo para ambos)
export const MedidorPartido = ({ etiqueta, variables, fijos, limite }) => {
  const total = variables + fijos;
  const nivel = nivelUso(total, limite);
  const pctTotal = porcentajeUso(total, limite);
  const pctFijos = total ? Math.round((pctTotal * fijos) / total) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.875rem", marginBottom: "0.35rem" }}>
        <span style={{ fontWeight: 600, color: theme.tinta }}>{etiqueta}</span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: TEXTO_NIVEL[nivel], fontWeight: nivel === "ok" ? 400 : 700, whiteSpace: "nowrap" }}>
          {total.toLocaleString("es-CO")} de {limite.toLocaleString("es-CO")}
        </span>
      </div>
      <PistaPartida
        role="meter"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={limite}
        aria-valuenow={Math.min(total, limite)}
        aria-valuetext={`${total} de ${limite}: ${variables} variables y ${fijos} fijos`}
      >
        <Parte $pct={pctTotal - pctFijos} $color={COLOR_VARIABLES} />
        <Parte $pct={pctFijos} $color={COLOR_FIJOS} />
      </PistaPartida>
      <Leyenda aria-hidden="true">
        <span>
          <i style={{ background: COLOR_VARIABLES }} />
          Variables <b>{variables.toLocaleString("es-CO")}</b>
        </span>
        <span>
          <i style={{ background: COLOR_FIJOS }} />
          Fijos <b>{fijos.toLocaleString("es-CO")}</b>
        </span>
      </Leyenda>
    </div>
  );
};

const BotonPagina = styled.button`
  min-height: 2.75rem;
  padding: 0 0.9rem;
  border: 1px solid ${theme.bordeCampo};
  border-radius: 999px;
  background: #fff;
  color: ${theme.tinta};
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  &:focus-visible {
    outline: 3px solid ${theme.azulClaro};
    outline-offset: 2px;
  }
`;

//Paginación de las listas de la ficha: «Más recientes» / «Anteriores». Con una sola página no se muestra.
export const Paginador = ({ etiqueta, pagina, paginas, alCambiar }) =>
  paginas <= 1 ? null : (
    <nav aria-label={etiqueta} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginTop: "0.75rem" }}>
      <BotonPagina type="button" onClick={() => alCambiar(pagina - 1)} disabled={pagina <= 1}>
        Más recientes
      </BotonPagina>
      <span aria-live="polite" style={{ fontSize: "0.875rem", color: theme.tintaSuave, fontVariantNumeric: "tabular-nums" }}>
        Página {pagina} de {paginas}
      </span>
      <BotonPagina type="button" onClick={() => alCambiar(pagina + 1)} disabled={pagina >= paginas}>
        Anteriores
      </BotonPagina>
    </nav>
  );
```

**3B.2 `src/components/admin/HojaCliente.jsx`.** Cambios exactos:

a) Imports: la primera línea pasa a `import React, { useEffect, useState } from "react";`; añade
`import { NOMBRES_MES } from "../../functions/recurrencias";` y `import { paginar } from "../../functions/paginar";`; la línea de
`./elementos` pasa a `import { MedidorPartido, Paginador, PastillaEstado, fechaCorta } from "./elementos";`.

b) Después del styled `Acciones` añade:

```jsx
export const PAGOS_POR_PAGINA = 5;
export const MESES_POR_PAGINA = 6;

//«Noviembre de 2026»
const nombreMes = (anio, mes) => {
  const nombre = NOMBRES_MES[mes - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} de ${anio}`;
};
```

c) Firma y estado: reemplaza desde `//Detalle de un cliente…` hasta `const suspendido = cliente.estado === "suspendido";` por:

```jsx
//Detalle de un cliente: estado, vencimiento, uso del mes (variables y fijos), uso por mes, pagos del plan (paginados) y acciones
const HojaCliente = ({ cliente, uso, fijos, historial, ahora, alCerrar, alPagar, alEditar, alDarDias }) => {
  const pagos = usePagosCliente(cliente ? cliente.uid : null);
  const [error, cambiarError] = useState("");
  const [trabajando, cambiarTrabajando] = useState(false);
  const [paginaPagos, cambiarPaginaPagos] = useState(1);
  const [paginaMeses, cambiarPaginaMeses] = useState(1);
  const uid = cliente ? cliente.uid : null;
  useEffect(() => {
    cambiarPaginaPagos(1);
    cambiarPaginaMeses(1);
  }, [uid]);
  if (!cliente) return null;
  const suspendido = cliente.estado === "suspendido";
  const vistaPagos = paginar(pagos || [], paginaPagos, PAGOS_POR_PAGINA);
  const vistaMeses = paginar(historial || [], paginaMeses, MESES_POR_PAGINA);
```

d) En la sección «Uso del mes» reemplaza la línea del `<Medidor …/>` por
`<MedidorPartido etiqueta="Gastos del mes" variables={Math.max(0, uso - fijos)} fijos={fijos} limite={cliente.limites.gastosMes} />`.

e) Reemplaza la `<Seccion aria-label="Pagos">…</Seccion>` completa por estas dos secciones:

```jsx
      <Seccion aria-label="Uso por mes">
        <h3>Uso por mes</h3>
        {vistaMeses.paginas === 1 && vistaMeses.elementos.length === 0 ? (
          <p style={{ color: theme.tintaSuave }}>Todavía no hay gastos registrados.</p>
        ) : (
          <>
            <Pagos>
              {vistaMeses.elementos.map((m) => (
                <li key={`${m.anio}-${m.mes}`}>
                  <span>
                    {nombreMes(m.anio, m.mes)}
                    <small>
                      {Math.max(0, m.gastos - m.fijos)} variables · {m.fijos} fijos
                    </small>
                  </span>
                  <b>
                    {m.gastos} {m.gastos === 1 ? "gasto" : "gastos"}
                  </b>
                </li>
              ))}
            </Pagos>
            <Paginador etiqueta="Páginas de uso por mes" pagina={vistaMeses.pagina} paginas={vistaMeses.paginas} alCambiar={cambiarPaginaMeses} />
          </>
        )}
      </Seccion>

      <Seccion aria-label="Pagos">
        <h3>Pagos registrados{pagos && pagos.length ? ` (${pagos.length})` : ""}</h3>
        {pagos === null ? (
          <p role="status" style={{ color: theme.tintaSuave }}>Cargando…</p>
        ) : pagos.length === 0 ? (
          <p style={{ color: theme.tintaSuave }}>Todavía no hay pagos.</p>
        ) : (
          <>
            <Pagos>
              {vistaPagos.elementos.map((p) => (
                <li key={p.id}>
                  <span>
                    {fechaCorta(p.fechaPago)} · {PLANES[p.plan].nombre}
                    <small>{p.referencia ? `${p.referencia} · ` : ""}hasta el {fechaCorta(p.venceDespues)}</small>
                  </span>
                  <b>{FormatearCantidad(p.monto)}</b>
                </li>
              ))}
            </Pagos>
            <Paginador etiqueta="Páginas de pagos" pagina={vistaPagos.pagina} paginas={vistaPagos.paginas} alCambiar={cambiarPaginaPagos} />
          </>
        )}
      </Seccion>
```

f) En `<Acciones>`, entre «Cambiar plan o editar» y el botón de suspender, añade:

```jsx
        <BotonSecundario type="button" onClick={() => alDarDias(cliente)}>
          Dar días de prueba
        </BotonSecundario>
```

**3B.3 `src/components/admin/HojaDiasPrueba.jsx` (nuevo), completo:**

```jsx
import React, { useEffect, useRef, useState } from "react";
import Hoja from "../Hoja";
import { BotonPrincipal, Espera, MensajeError } from "../auth/elementos";
import { Formulario, Etiqueta, Entrada, Ayuda } from "../recurrentes/elementos";
import { DIAS_PRUEBA_MIN, DIAS_PRUEBA_MAX, nuevoVencimiento } from "../../functions/planes";
import { darDiasPrueba } from "../../firebase/clientes";
import { fechaCorta } from "./elementos";

let contador = 0;

//Días de prueba (cortesía) para un cliente que ya existe: se suman al vencimiento sin cobrar y quedan en el historial con $0
const HojaDiasPrueba = ({ cliente, alCerrar }) => {
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `diasprueba-${++contador}`;
  const id = idBase.current;
  const [dias, cambiarDias] = useState("7");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    cambiarDias("7");
    cambiarError("");
    cambiarEnviando(false);
  }, [cliente]);

  if (!cliente) return null;
  const n = Number(dias);
  const valido = dias !== "" && Number.isInteger(n) && n >= DIAS_PRUEBA_MIN && n <= DIAS_PRUEBA_MAX;

  const guardar = async (e) => {
    e.preventDefault();
    if (!valido) return cambiarError(`Escribe un número de días entre ${DIAS_PRUEBA_MIN} y ${DIAS_PRUEBA_MAX}.`);
    cambiarEnviando(true);
    try {
      await darDiasPrueba(cliente, n);
      alCerrar(true);
    } catch (err) {
      console.log(err);
      cambiarError(err && err.code === "permission-denied" ? "Sin permiso: solo el super admin puede dar días de prueba." : "No pudimos guardar los días. Inténtalo de nuevo.");
      cambiarEnviando(false);
    }
  };

  return (
    <Hoja abierta alCerrar={() => alCerrar(false)} titulo="Dar días de prueba" subtitulo={cliente.correo}>
      <Formulario onSubmit={guardar} noValidate aria-busy={enviando}>
        <div>
          <Etiqueta htmlFor={`${id}-dias`}>Días</Etiqueta>
          <Entrada
            id={`${id}-dias`}
            name="dias"
            inputMode="numeric"
            autoComplete="off"
            value={dias}
            onChange={(e) => {
              cambiarDias(e.target.value.replace(/\D/g, ""));
              cambiarError("");
            }}
          />
        </div>
        <Ayuda>
          Se suman al vencimiento actual ({fechaCorta(cliente.vence)}) o desde hoy si ya venció. No se cobra: queda en el historial con $0.
          {valido ? ` Nuevo vencimiento: ${fechaCorta(nuevoVencimiento(cliente.vence, n))}.` : ""}
        </Ayuda>
        {error && <MensajeError role="alert">{error}</MensajeError>}
        <BotonPrincipal type="submit" disabled={enviando}>
          {enviando ? <Espera aria-hidden="true" /> : null}
          Dar días
        </BotonPrincipal>
      </Formulario>
    </Hoja>
  );
};

export default HojaDiasPrueba;
```

**3B.4 `src/components/admin/HojaPlanCliente.jsx`.**

a) El import de planes pasa a
`import { PLANES, IDS_PLAN, CLAVES_LIMITE, ETIQUETAS_LIMITE, limitesDePlan, diasDePrueba, nuevoVencimiento, DIAS_PRUEBA_MAX } from "../../functions/planes";`.

b) Después de `const [notas, cambiarNotas] = useState("");` añade `const [diasPrueba, cambiarDiasPrueba] = useState(""); //vacío = 30`.
En el `useEffect`, después de `cambiarNotas(…);` añade `cambiarDiasPrueba("");`.

c) Después de `const conApi = Boolean(urlApiClientes());` añade:

```jsx
  //Los días de prueba se piden al crear un cliente en Prueba o al pasar a Prueba a uno que tenía otro plan
  const pideDias = plan === "prueba" && (!editando || cliente.plan !== "prueba");
```

d) En `guardar`, justo después de `const hayExtras = Object.keys(extras).length > 0;` añade:

```jsx
    const dias = pideDias ? diasDePrueba(diasPrueba) : null;
    if (pideDias && dias === null) return cambiarError(`Los días de prueba deben ser un número entero entre 1 y ${DIAS_PRUEBA_MAX}, o déjalo vacío para ${PLANES.prueba.dias}.`);
```

e) En la rama `if (editando) {` reemplaza la línea `await actualizarCliente(cliente.uid, { nombre, notas, plan, limites, estado: … });` por:

```jsx
        const cambios = { nombre, notas, plan, limites, estado: cliente.estado === "suspendido" ? undefined : plan === "prueba" ? "prueba" : "activo" };
        //Al pasar a Prueba el vencimiento nunca se acorta: gana el mayor entre el actual y hoy + días de prueba
        if (pideDias) {
          const venceActual = cliente.vence && cliente.vence.toMillis ? cliente.vence.toMillis() : Number(cliente.vence) || 0;
          cambios.vence = Math.max(venceActual, nuevoVencimiento(null, dias));
        }
        await actualizarCliente(cliente.uid, cambios);
```

(`estado: undefined` no llega a Firestore: `actualizarCliente` solo copia `estado` si tiene valor.)

f) `crearClienteConAcceso({ correo, nombre, plan, notas })` pasa a `crearClienteConAcceso({ correo, nombre, plan, notas, dias: pideDias ? dias : undefined })`
y `asignarPlan({ uid, correo, nombre, plan, notas })` pasa a `asignarPlan({ uid, correo, nombre, plan, notas, dias: pideDias ? dias : undefined })`.

g) En el JSX, justo después del `</div>` que cierra el bloque del selector «Plan» (el que termina con la `<Ayuda>` de gastos variables), añade:

```jsx
        {pideDias && (
          <div>
            <Etiqueta htmlFor={`${id}-dias`}>Días de prueba</Etiqueta>
            <Entrada
              id={`${id}-dias`}
              name="dias"
              inputMode="numeric"
              autoComplete="off"
              placeholder={String(PLANES.prueba.dias)}
              value={diasPrueba}
              onChange={(e) => cambiarDiasPrueba(e.target.value.replace(/\D/g, ""))}
            />
            <Ayuda>Vacío = {PLANES.prueba.dias} días. Entre 1 y {DIAS_PRUEBA_MAX}. El plan vence al terminar el último día (hora de Colombia).</Ayuda>
          </div>
        )}
```

**3B.5 `src/components/paginas/PaginaAdmin.jsx`.**

- Import de elementos: `Medidor` pasa a `MedidorPartido` (`import { PastillaEstado, TONOS, MedidorPartido, fechaCorta } from "../admin/elementos";`). Añade `import HojaDiasPrueba from "../admin/HojaDiasPrueba";` después del de `HojaPagoPlan`.
- `const { clientes, usos, error } = useClientesAdmin(esAdmin);` → `const { clientes, usos, fijos, historial, error } = useClientesAdmin(esAdmin);`
- Después de `const [pagando, cambiarPagando] = useState(null);` añade `const [regalando, cambiarRegalando] = useState(null); //cliente al que se le dan días de prueba`.
- Celda de la tabla: `<td><Medidor etiqueta={`Gastos de ${f.nombre || f.correo}`} … /></td>` →
  `<td><MedidorPartido etiqueta={`Gastos de ${f.nombre || f.correo}`} variables={Math.max(0, (usos[f.uid] || 0) - (fijos[f.uid] || 0))} fijos={fijos[f.uid] || 0} limite={f.limites.gastosMes} /></td>`
- Tarjeta móvil: `<Medidor etiqueta="Gastos del mes" … />` →
  `<MedidorPartido etiqueta="Gastos del mes" variables={Math.max(0, (usos[f.uid] || 0) - (fijos[f.uid] || 0))} fijos={fijos[f.uid] || 0} limite={f.limites.gastosMes} />`
- `<HojaCliente …>`: añade las props `fijos={detalle ? fijos[detalle.uid] || 0 : 0}`, `historial={detalle ? historial[detalle.uid] || [] : []}` y `alDarDias={(c) => cambiarRegalando(c)}`.
- Después de `<HojaPagoPlan … />` añade `<HojaDiasPrueba cliente={regalando} alCerrar={() => cambiarRegalando(null)} />`.

**3.6 Comprobar y cerrar (principal).** `CI=true npm test -- --watchAll=false`, `cd worker-recordatorios && npm test` (31), `CI=true npm run build`.
Commit (`git add` de los 13 archivos de 3A y 3B): `Panel admin: historial paginado, barra con gastos fijos y días de prueba`

**PARAR AQUÍ.** Reporta las cifras. El dueño revisa en una vista previa (regla del dueño: vista previa antes de seguir). Antes debe
desplegar las reglas de la Fase 1 (ver «Lo que hace el dueño», pasos 1–2), porque la vista previa usa el Firestore real.
Comando que el dueño corre: `npm run build && PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH firebase hosting:channel:deploy admin-prueba-sms --expires 7d`.

---

## Fase 4 · Worker: SMS programado y push por turnos

**Agente `worker`.** Archivos: `worker-recordatorios/src/sms.js` (nuevo), `worker-recordatorios/src/firestore.js`,
`worker-recordatorios/src/recordatorios.js`, `worker-recordatorios/src/api.js`, `worker-recordatorios/wrangler.jsonc`,
`worker-recordatorios/package.json` (solo el script `test`), `worker-recordatorios/test/sms.test.js` (nuevo),
`worker-recordatorios/test/recordatorios.test.js`.

**4.1 `worker-recordatorios/src/firestore.js`.** Al final añade:

```js
//Lee un documento por su ruta relativa («clientes/uid»); null si no existe
export const leerDocumentoPorRuta = async (env, token, pedir, ruta) => {
  const respuesta = await pedir(`${urlBase(env)}/v1/${raiz(env)}/${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`Firestore ${respuesta.status}`);
  return leerDocumento(await respuesta.json());
};

//Pagos activos de una persona que vencen en `fecha` (AAAA-MM-DD). Solo igualdades: no necesita índice compuesto.
export const pagosActivosDelDia = (env, token, pedir, uid, fecha) => consulta(env, token, pedir, {
  from: [{ collectionId: "recurrentes" }],
  where: { compositeFilter: { op: "AND", filters: [
    { fieldFilter: { field: { fieldPath: "uidUsuario" }, op: "EQUAL", value: { stringValue: uid } } },
    { fieldFilter: { field: { fieldPath: "activo" }, op: "EQUAL", value: { booleanValue: true } } },
    { fieldFilter: { field: { fieldPath: "proximaFecha" }, op: "EQUAL", value: { stringValue: fecha } } },
  ] } },
  limit: 5,
});
```

**4.2 `worker-recordatorios/src/sms.js` (nuevo), completo:**

```js
//SMS del día del pago por LabsMobile (https://www.labsmobile.com/es/api-sms/versiones-api/http-rest-post-json).
//Lección de ZF Manager (zona-fit-backend/src/enviarSMS.js): LabsMobile responde HTTP 200 TAMBIÉN cuando rechaza; solo
//`code === "0"` es aceptado. Por eso enviarSms lanza ante cualquier otro código y el cron solo marca `ultimoSms` si no hubo
//excepción: el reintento sale solo en el siguiente turno. Los registros nunca llevan números, nombres ni textos.
//Credenciales: secretos LABS_MOBILE_USER (correo de la cuenta) y LABS_MOBILE_TOKEN (wrangler secret put), nunca en el repo.
import { puedeEscribir } from "../../src/functions/planes.js";
import { hoyEnZona, ZONA_POR_DEFECTO } from "../../src/functions/recurrencias.js";
import { CELULAR_VALIDO, textoSms, remitenteSms, subidSms } from "../../src/functions/sms.js";
import { leerDocumentoPorRuta, pagosActivosDelDia, confirmar } from "./firestore.js";

const base = (env) => env.LABSMOBILE_BASE || "https://api.labsmobile.com";
//8:30 a. m. en Colombia (UTC-5, sin horario de verano). LabsMobile pide `scheduled` en GMT.
export const HORA_SMS_GMT = "13:30:00";

export const hayCredencialesSms = (env) => Boolean(env.LABS_MOBILE_USER && env.LABS_MOBILE_TOKEN);

const llamarLabs = async (env, pedir, camino, cuerpo) => {
  const respuesta = await pedir(`${base(env)}${camino}`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${env.LABS_MOBILE_USER}:${env.LABS_MOBILE_TOKEN}`)}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  let datos = {};
  try { datos = await respuesta.json(); } catch { /* sin JSON */ }
  return { respuesta, datos };
};

//Envía (o programa, con `programado` = «AAAA-MM-DD HH:MM:SS» GMT) un SMS. Lanza si LabsMobile no lo acepta.
export const enviarSms = async (env, pedir, { numero, mensaje, remitente, subid, programado }) => {
  const cuerpo = { message: mensaje, tpoa: remitente, recipient: [{ msisdn: numero }], subid, label: "finanzas-recordatorio" };
  if (programado) cuerpo.scheduled = programado;
  const { respuesta, datos } = await llamarLabs(env, pedir, "/json/send", cuerpo);
  if (!respuesta.ok || String(datos.code) !== "0") {
    const error = new Error(`LabsMobile no aceptó el SMS (HTTP ${respuesta.status}, code ${datos.code})`);
    error.estadoHttp = respuesta.status;
    error.codigoLabsMobile = String(datos.code ?? "");
    throw error;
  }
  return datos;
};

//Cancela un SMS programado con el MISMO subid con que se programó (confirmado por LabsMobile). Nunca con "*": cancelaría los
//pendientes de toda la cuenta. code 52 («no encontrado»: ya salió o ya se canceló) también cuenta como hecho.
export const cancelarSmsProgramado = async (env, pedir, subid) => {
  if (!subid || subid === "*") return false;
  const { datos } = await llamarLabs(env, pedir, "/json/scheduled", { cmd: "cancel", subid });
  return ["0", "52"].includes(String(datos.code));
};

//¿Toca SMS a esta persona? Devuelve {envio, marca} o null. Antes de las 8:30 (turno null) se PROGRAMA para las 8:30;
//desde las 8:30, si no salió (falló la corrida de las 8:00), se envía YA. Una vez por persona y día (`ultimoSms`).
export const smsPendiente = ({ perfil, cliente, pagosHoy, hoy, ahora, turno }) => {
  if (!pagosHoy.length || !perfil || perfil.smsActivo !== true || !CELULAR_VALIDO.test(perfil.celular || "")) return null;
  if (!cliente || !puedeEscribir({ ...cliente, vence: Date.parse(cliente.vence) }, ahora.getTime())) return null;
  if (typeof cliente.ultimoSms === "string" && cliente.ultimoSms.startsWith(`${hoy}|`)) return null;
  const subid = subidSms(cliente.id, hoy);
  const envio = { numero: perfil.celular.slice(1), mensaje: textoSms(pagosHoy, perfil.detalleEnAviso === true), remitente: remitenteSms(cliente.nombre), subid };
  if (turno === null) envio.programado = `${hoy} ${HORA_SMS_GMT}`;
  return { envio, marca: { ruta: cliente.ruta, clave: `${hoy}|${subid}`, campo: "ultimoSms" } };
};

//POST /sms/revisar: tras registrar, omitir, pausar o borrar un gasto fijo, si el SMS de hoy sigue programado (antes de las 8:30)
//y ya no queda ningún pago activo que venza hoy, se cancela. Devuelve "cancelado" | "sigue" | "nada".
export const revisarSmsProgramado = async (env, accessToken, pedir, uid, ahora) => {
  if (!hayCredencialesSms(env)) return "nada";
  const hoy = hoyEnZona(ZONA_POR_DEFECTO, ahora);
  if (ahora.getTime() >= Date.parse(`${hoy}T${HORA_SMS_GMT}Z`)) return "nada"; //ya salió
  const cliente = await leerDocumentoPorRuta(env, accessToken, pedir, `clientes/${uid}`);
  if (!cliente || typeof cliente.ultimoSms !== "string") return "nada";
  const [fecha, subid] = cliente.ultimoSms.split("|");
  if (fecha !== hoy || !subid || subid === "cancelado") return "nada";
  if ((await pagosActivosDelDia(env, accessToken, pedir, uid, hoy)).length) return "sigue";
  if (!(await cancelarSmsProgramado(env, pedir, subid))) return "sigue";
  await confirmar(env, accessToken, pedir, { avisos: [{ ruta: cliente.ruta, clave: `${hoy}|cancelado`, campo: "ultimoSms" }], tokensABorrar: [] });
  return "cancelado";
};
```

**4.3 `worker-recordatorios/src/recordatorios.js`.** Reemplaza el archivo completo:

```js
//Ciclo de avisos. El cron corre a las 8:00 y a las 8:30, 11:30, 14:30 y 17:30 (hora de Colombia; ver wrangler.jsonc):
//  1) pagos recurrentes: push 3 días antes (una vez) y el día del pago en cada turno desde las 8:30 hasta que se registre
//     (UN aviso por persona y turno); SMS del día del pago, programado a las 8:00 para las 8:30 (ver sms.js);
//  2) planes de los clientes: al cliente cuando le faltan 7, 3 o 0 días y al vencer, y un resumen semanal al super admin.
//Comparte el cálculo de fechas con la app (src/functions/recurrencias.js, planes.js y sms.js).
import { avisoPendiente, claveAviso, hoyEnZona, sumarDias, turnoDelDia, ZONA_POR_DEFECTO } from "../../src/functions/recurrencias.js";
import { obtenerAccessToken } from "./google.js";
import { pagosEnVentana, perfiles, todosLosTokens, todosLosClientes, superAdmins, confirmar } from "./firestore.js";
import { enviarPush } from "./fcm.js";
import { avisosAClientes, resumenParaAdmins } from "./planes.js";
import { smsPendiente, enviarSms, hayCredencialesSms } from "./sms.js";

//Límites del plan Free de Workers: 50 subrequests por ejecución (7 fijas + 1 por push + 1 por SMS + 1 de confirmación)
export const MAX_ENVIOS = 30;
export const MAX_SMS = 8;
export const MAX_TOKENS_POR_PERSONA = 10;
export const MAX_PAGOS_POR_PERSONA = 100;
const DIAS_MAX_TOKEN = 270; //FCM da por inactivo un token sin renovar en ~270 días
const MAX_DETALLE = 120;

const diasDesde = (iso, ahora) => (ahora.getTime() - new Date(iso).getTime()) / 86400000;

//Texto opcional con las descripciones (nunca montos); solo si la persona lo activó
const armarDetalle = (pagos) => pagos.map((p) => p.descripcion).join(", ").slice(0, MAX_DETALLE);

export const ejecutar = async (env, { fetch: pedir = fetch, ahora = new Date() } = {}) => {
  const resumen = { personas: 0, avisos: 0, enviados: 0, tokensBorrados: 0, omitidos: 0, avisosPlan: 0, resumenesAdmin: 0, sms: 0, smsFallidos: 0, smsOmitidos: 0 };
  const cuenta = JSON.parse(env.GOOGLE_SA_JSON);
  const accessToken = await obtenerAccessToken(cuenta, { fetch: pedir, ahoraSeg: Math.floor(ahora.getTime() / 1000) });
  const turno = turnoDelDia(ahora);

  //Ventana amplia en UTC (cubre cualquier zona horaria); el filtro exacto se hace con la fecha local de cada persona
  const hoyUTC = hoyEnZona("UTC", ahora);
  const pagos = await pagosEnVentana(env, accessToken, pedir, sumarDias(hoyUTC, -1), sumarDias(hoyUTC, 4));
  const clientes = await todosLosClientes(env, accessToken, pedir);
  const admins = await superAdmins(env, accessToken, pedir);
  const clientePorUid = new Map(clientes.map((c) => [c.id, c]));

  //Destinatarios: cada uno con su mensaje y las marcas que se escriben si llegó a algún dispositivo
  const destinos = [];
  const marcasSms = [];
  let smsUsados = 0;
  const limitePorPersona = new Map(clientes.map((c) => [c.id, Number.isInteger(c.limites?.dispositivos) && c.limites.dispositivos > 0 ? c.limites.dispositivos : MAX_TOKENS_POR_PERSONA]));

  const porPersona = new Map();
  for (const p of pagos) {
    if (!porPersona.has(p.uidUsuario)) porPersona.set(p.uidUsuario, []);
    if (porPersona.get(p.uidUsuario).length < MAX_PAGOS_POR_PERSONA) porPersona.get(p.uidUsuario).push(p);
  }
  if (porPersona.size) {
    const datosPerfil = await perfiles(env, accessToken, pedir, [...porPersona.keys()]);
    for (const [uid, lista] of porPersona) {
      const perfil = datosPerfil[uid];
      const hoy = hoyEnZona(perfil?.zona || ZONA_POR_DEFECTO, ahora);

      //SMS del día del pago: se decide con TODOS los pagos activos de hoy (avisados por push o no)
      const sms = smsPendiente({ perfil, cliente: clientePorUid.get(uid), pagosHoy: lista.filter((p) => p.activo && p.proximaFecha === hoy), hoy, ahora, turno });
      if (sms) {
        if (!hayCredencialesSms(env) || smsUsados >= MAX_SMS) resumen.smsOmitidos++;
        else {
          smsUsados++;
          try {
            await enviarSms(env, pedir, sms.envio);
            resumen.sms++;
            marcasSms.push(sms.marca);
          } catch (e) {
            resumen.smsFallidos++;
            console.error(JSON.stringify({ evento: "sms-error", codigo: e.codigoLabsMobile || String(e.estadoHttp || "red") }));
          }
        }
      }

      const avisos = lista.map((p) => ({ pago: p, tipo: avisoPendiente(p, hoy, turno) })).filter((a) => a.tipo);
      if (!avisos.length) continue;
      const datos = { tipo: "recordatorio", cantidad: String(avisos.length), url: "/recurrentes" };
      if (avisos.some((a) => a.tipo === "hoy")) datos.hoy = "1";
      if (perfil?.detalleEnAviso) datos.detalle = armarDetalle(avisos.map((a) => a.pago));
      resumen.personas++;
      resumen.avisos += avisos.length;
      destinos.push({ uid, datos, marcas: avisos.map(({ pago, tipo }) => ({ ruta: pago.ruta, clave: claveAviso(pago, tipo, turno) })) });
    }
  }

  for (const a of avisosAClientes(clientes, ahora.getTime())) {
    resumen.avisosPlan++;
    destinos.push({ uid: a.uid, datos: a.datos, marcas: [{ ruta: a.ruta, clave: a.clave, campo: a.campo }] });
  }
  for (const a of resumenParaAdmins(admins, clientes, ahora)) {
    resumen.resumenesAdmin++;
    destinos.push({ uid: a.uid, datos: a.datos, marcas: [{ ruta: a.ruta, clave: a.clave, campo: a.campo }] });
  }
  if (!destinos.length) {
    if (marcasSms.length) await confirmar(env, accessToken, pedir, { avisos: marcasSms, tokensABorrar: [] });
    return resumen;
  }

  const tokens = await todosLosTokens(env, accessToken, pedir);
  const confirmados = [];
  const aBorrar = new Set();
  let envios = 0;
  for (const { uid, datos, marcas } of destinos) {
    //Dispositivos vigentes: los más recientes, hasta el cupo de su plan (por defecto 10)
    const tope = Math.min(MAX_TOKENS_POR_PERSONA, limitePorPersona.get(uid) ?? MAX_TOKENS_POR_PERSONA);
    const vigentes = [];
    for (const t of tokens.filter((x) => x.uid === uid).sort((a, b) => (a.actualizado < b.actualizado ? 1 : -1))) {
      if (vigentes.length >= tope || diasDesde(t.actualizado, ahora) > DIAS_MAX_TOKEN) { aBorrar.add(t.ruta); continue; }
      vigentes.push(t);
    }
    let llego = false;
    for (const t of vigentes) {
      if (envios >= MAX_ENVIOS) { resumen.omitidos++; continue; }
      envios++;
      const r = await enviarPush(env, accessToken, pedir, t.token, datos);
      if (r.ok) { llego = true; resumen.enviados++; } else if (r.invalido) aBorrar.add(t.ruta);
    }
    //Solo se marca como avisado si al menos un dispositivo lo recibió: si no, el siguiente turno no «gasta» el aviso
    if (llego) confirmados.push(...marcas);
  }
  resumen.tokensBorrados = aBorrar.size;
  await confirmar(env, accessToken, pedir, { avisos: [...confirmados, ...marcasSms], tokensABorrar: [...aBorrar] });
  return resumen;
};
```

**4.4 `worker-recordatorios/src/api.js`.**

- Añade `import { revisarSmsProgramado } from "./sms.js";` después del import de `firestore.js`.
- Cambia el comentario de cabecera (líneas 1–3) a: `//API del Worker. POST /clientes (crear cliente; solo super admin) y POST /sms/revisar (cancelar el SMS programado de hoy si`
  `//ya no queda ningún pago que venza; cualquier persona con sesión, solo sobre lo suyo). Nunca se registran correos, ids ni tokens.`
- Reemplaza `if (request.method !== "POST" || pathname !== "/clientes") return responder(request, env, 404, { error: "no-encontrado" });` por
  `if (request.method !== "POST" || !["/clientes", "/sms/revisar"].includes(pathname)) return responder(request, env, 404, { error: "no-encontrado" });`
- Justo después de `const accessToken = await obtenerAccessToken(…);` (antes del paso 2) añade:

```js
  //POST /sms/revisar: el uid sale del ID token verificado, nunca del cuerpo
  if (pathname === "/sms/revisar") {
    const estado = await revisarSmsProgramado(env, accessToken, pedir, quien.uid, ahora);
    console.log(JSON.stringify({ evento: "sms-revisado", estado }));
    return responder(request, env, 200, { estado });
  }
```

**4.5 `worker-recordatorios/wrangler.jsonc`.** Reemplaza el comentario y la línea de `triggers` por:

```jsonc
  // El cron de Cloudflare siempre es UTC; Colombia es UTC-5 sin horario de verano.
  // 13:00 UTC = 8:00 (avisos de 3 días, planes y programación del SMS de las 8:30).
  // 13:30, 16:30, 19:30 y 22:30 UTC = 8:30, 11:30, 14:30 y 17:30: push del día del pago por turnos (src/functions/recurrencias.js).
  "triggers": { "crons": ["0 13 * * *", "30 13,16,19,22 * * *"] },
```

En el comentario de `secrets` añade al final: `. Opcionales: LABS_MOBILE_USER y LABS_MOBILE_TOKEN (SMS); sin ellos no se envían SMS`. **No** los añadas a `required`.

**4.6 `worker-recordatorios/package.json`.** En `scripts.test` añade `test/sms.test.js` después de `test/api.test.js`.

**4.7 Pruebas `worker-recordatorios/test/recordatorios.test.js`.**

a) En `crearFetch`, añade el parámetro `labs = () => ({ code: "0" })` a la desestructuración y, antes de `throw new Error(\`URL inesperada …\`)`, añade:

```js
    if (String(url).includes("api.labsmobile.com")) {
      const r = labs(cuerpo, String(url));
      return json(r, r.http || 200);
    }
```

b) Después de `const enviosDe = …` añade:

```js
const smsDe = (llamadas) => llamadas.filter((l) => l.url.includes("api.labsmobile.com"));
const envSms = { ...env, LABS_MOBILE_USER: "yo@correo.co", LABS_MOBILE_TOKEN: "tk" };
const docCli = (uid, extra = {}) => ({ document: { name: `projects/demo/databases/(default)/documents/clientes/${uid}`, fields: { ...campos({ correo: `${uid}@x.co`, nombre: "Ana Pérez", plan: "basico", estado: "activo", ...extra }), vence: { timestampValue: "2026-12-31T04:59:59.999Z" } } } });
const conSms = { smsActivo: true, celular: "+573001234567" };
const A_LAS = (hora) => new Date(`2026-11-10T${hora}:00Z`); //el pago de docRec vence el 10
```

c) Al final añade:

```js
test("8:00: programa el SMS para las 8:30 (13:30 GMT) y todavía no manda el push del día", async () => {
  const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", conSms)], clientes: [docCli("ana")], tokens: [docTok("ana", "t1")] });
  const r = await ejecutar(envSms, { fetch: pedir, ahora: A_LAS("13:00") });
  assert.deepEqual([r.sms, r.avisos], [1, 0]);
  assert.equal(enviosDe(llamadas).length, 0);
  const [sms] = smsDe(llamadas);
  assert.equal(sms.url, "https://api.labsmobile.com/json/send");
  assert.equal(sms.init.headers.Authorization, `Basic ${btoa("yo@correo.co:tk")}`);
  assert.deepEqual(sms.cuerpo, {
    message: "Hoy vence 1 gasto fijo en Finanzas. Registralo en finanzas.zfmanager.com/recurrentes",
    tpoa: "AnaPerez",
    recipient: [{ msisdn: "573001234567" }],
    subid: "fana20261110",
    label: "finanzas-recordatorio",
    scheduled: "2026-11-10 13:30:00",
  });
  const marca = commitDe(llamadas).find((w) => w.updateMask?.fieldPaths[0] === "ultimoSms");
  assert.equal(marca.update.fields.ultimoSms.stringValue, "2026-11-10|fana20261110");
  assert.ok(marca.update.name.endsWith("clientes/ana"));
});

test("el día del pago el push se repite por turno (8:30 y 11:30) con hoy=1 y para cuando ya se avisó ese turno", async () => {
  const base = { perfilesRes: [docPerfil("ana")], clientes: [docCli("ana")], tokens: [docTok("ana", "t1")] };
  let f = crearFetch({ ...base, recs: [docRec("a", "ana")] });
  await ejecutar(env, { fetch: f.pedir, ahora: A_LAS("13:30") });
  assert.equal(enviosDe(f.llamadas)[0].cuerpo.message.data.hoy, "1");
  assert.equal(commitDe(f.llamadas).find((w) => w.update?.fields.ultimoAviso).update.fields.ultimoAviso.stringValue, "2026-11-10:hoy:0");

  f = crearFetch({ ...base, recs: [docRec("a", "ana", { ultimoAviso: "2026-11-10:hoy:0" })] });
  await ejecutar(env, { fetch: f.pedir, ahora: A_LAS("16:30") });
  assert.equal(commitDe(f.llamadas).find((w) => w.update?.fields.ultimoAviso).update.fields.ultimoAviso.stringValue, "2026-11-10:hoy:1");

  f = crearFetch({ ...base, recs: [docRec("a", "ana", { ultimoAviso: "2026-11-10:hoy:1" })] });
  const r = await ejecutar(env, { fetch: f.pedir, ahora: A_LAS("16:45") });
  assert.equal(r.avisos, 0);
  assert.equal(smsDe(f.llamadas).length, 0); //sin smsActivo no hay SMS
});

test("si el SMS de las 8:00 falló (code 35) no se marca, y a las 8:30 sale de inmediato", async () => {
  const base = { recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", conSms)], clientes: [docCli("ana")], tokens: [docTok("ana", "t1")] };
  let f = crearFetch({ ...base, labs: () => ({ code: "35", message: "sin créditos" }) });
  let r = await ejecutar(envSms, { fetch: f.pedir, ahora: A_LAS("13:00") });
  assert.deepEqual([r.sms, r.smsFallidos], [0, 1]);
  assert.equal(commitDe(f.llamadas).length, 0);

  f = crearFetch(base);
  r = await ejecutar(envSms, { fetch: f.pedir, ahora: A_LAS("13:30") });
  assert.equal(r.sms, 1);
  assert.equal(smsDe(f.llamadas)[0].cuerpo.scheduled, undefined);
});

test("no hay SMS sin activar, con celular inválido, con plan vencido, ya enviado hoy o sin credenciales", async () => {
  const casos = [
    [env, { perfil: conSms, cliente: {} }],
    [envSms, { perfil: { smsActivo: false, celular: "+573001234567" }, cliente: {} }],
    [envSms, { perfil: { smsActivo: true, celular: "3001234567" }, cliente: {} }],
    [envSms, { perfil: conSms, cliente: { estado: "suspendido" } }],
    [envSms, { perfil: conSms, cliente: { ultimoSms: "2026-11-10|cancelado" } }],
  ];
  for (const [entorno, { perfil, cliente }] of casos) {
    const { pedir, llamadas } = crearFetch({ recs: [docRec("a", "ana")], perfilesRes: [docPerfil("ana", perfil)], clientes: [docCli("ana", cliente)], tokens: [docTok("ana", "t1")] });
    await ejecutar(entorno, { fetch: pedir, ahora: A_LAS("13:00") });
    assert.equal(smsDe(llamadas).length, 0);
  }
});

test(`tope de ${MAX_SMS} SMS por ejecución`, async () => {
  const uids = Array.from({ length: MAX_SMS + 2 }, (_, i) => `p${i}`);
  const { pedir, llamadas } = crearFetch({
    recs: uids.map((u) => docRec(`r${u}`, u)),
    perfilesRes: uids.map((u) => docPerfil(u, conSms)),
    clientes: uids.map((u) => docCli(u)),
  });
  const r = await ejecutar(envSms, { fetch: pedir, ahora: A_LAS("13:00") });
  assert.equal(smsDe(llamadas).length, MAX_SMS);
  assert.deepEqual([r.sms, r.smsOmitidos], [MAX_SMS, 2]);
});
```

y cambia el import a `import { ejecutar, MAX_ENVIOS, MAX_SMS } from "../src/recordatorios.js";`.

**4.8 Pruebas `worker-recordatorios/test/sms.test.js` (nuevo):**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { enviarSms, cancelarSmsProgramado, revisarSmsProgramado } from "../src/sms.js";

const env = { GCP_PROJECT_ID: "demo", LABS_MOBILE_USER: "yo@correo.co", LABS_MOBILE_TOKEN: "tk" };
const json = (o, status = 200) => ({ ok: status < 300, status, json: async () => o });
const ENVIO = { numero: "573001234567", mensaje: "Hola", remitente: "Ana", subid: "fana20261110" };
const RUTA = "projects/demo/databases/(default)/documents/clientes/ana";
const cliente = (ultimoSms) => ({ name: RUTA, fields: { ultimoSms: { stringValue: ultimoSms } } });

//Firestore + LabsMobile falsos para /sms/revisar
const crear = ({ doc = cliente("2026-11-10|fana20261110"), pendientes = [], labs = { code: "0" } } = {}) => {
  const llamadas = [];
  const pedir = async (url, init = {}) => {
    llamadas.push({ url: String(url), cuerpo: init.body ? JSON.parse(init.body) : null });
    if (String(url).includes("api.labsmobile.com")) return json(labs);
    if (String(url).endsWith(":runQuery")) return json(pendientes.map((p) => ({ document: p })));
    if (String(url).endsWith(":commit")) return json({});
    if (String(url).endsWith("/clientes/ana")) return doc ? json(doc) : json({}, 404);
    throw new Error(`URL inesperada ${url}`);
  };
  return { pedir, llamadas };
};

test("enviarSms lanza si LabsMobile responde HTTP 200 con un code distinto de 0", async () => {
  const pedir = async () => json({ code: "27", message: "caracteres inválidos" });
  await assert.rejects(enviarSms(env, pedir, ENVIO), (e) => e.codigoLabsMobile === "27");
});

test("enviarSms acepta code 0 (texto o número)", async () => {
  assert.equal((await enviarSms(env, async () => json({ code: 0 }), ENVIO)).code, 0);
});

test("cancelar: 0 y 52 cuentan como hecho; otro código no", async () => {
  assert.equal(await cancelarSmsProgramado(env, async () => json({ code: "0" }), "x"), true);
  assert.equal(await cancelarSmsProgramado(env, async () => json({ code: "52" }, 400), "x"), true);
  assert.equal(await cancelarSmsProgramado(env, async () => json({ code: "30" }), "x"), false);
  //nunca cancela «todos» ni sin subid, y ni siquiera llama a LabsMobile
  let llamo = false;
  const espia = async () => { llamo = true; return json({ code: "0" }); };
  assert.equal(await cancelarSmsProgramado(env, espia, "*"), false);
  assert.equal(await cancelarSmsProgramado(env, espia, ""), false);
  assert.equal(llamo, false);
});

test("revisar a las 8:10: sin pagos de hoy cancela el programado y marca «cancelado»", async () => {
  const { pedir, llamadas } = crear();
  assert.equal(await revisarSmsProgramado(env, "AT", pedir, "ana", new Date("2026-11-10T13:10:00Z")), "cancelado");
  const labs = llamadas.find((l) => l.url.includes("labsmobile"));
  assert.deepEqual([labs.url, labs.cuerpo], ["https://api.labsmobile.com/json/scheduled", { cmd: "cancel", subid: "fana20261110" }]);
  const commit = llamadas.find((l) => l.url.endsWith(":commit")).cuerpo.writes[0];
  assert.equal(commit.update.fields.ultimoSms.stringValue, "2026-11-10|cancelado");
});

test("revisar: con otro pago que vence hoy sigue; después de las 8:30, sin SMS de hoy o sin credenciales no hace nada", async () => {
  const pendiente = { name: "projects/demo/databases/(default)/documents/recurrentes/ana_2", fields: {} };
  assert.equal(await revisarSmsProgramado(env, "AT", crear({ pendientes: [pendiente] }).pedir, "ana", new Date("2026-11-10T13:10:00Z")), "sigue");
  assert.equal(await revisarSmsProgramado(env, "AT", crear().pedir, "ana", new Date("2026-11-10T13:30:00Z")), "nada");
  assert.equal(await revisarSmsProgramado(env, "AT", crear({ doc: cliente("2026-11-09|fana20261109") }).pedir, "ana", new Date("2026-11-10T13:10:00Z")), "nada");
  assert.equal(await revisarSmsProgramado({ GCP_PROJECT_ID: "demo" }, "AT", crear().pedir, "ana", new Date("2026-11-10T13:10:00Z")), "nada");
});
```

**4.9 Comprobar y cerrar.** `cd worker-recordatorios && npm test` → 31 + 5 + 5 = **41** (2 del emulador omitidas), 0 fallos.
`npx wrangler deploy --dry-run` debe empaquetar sin errores (no despliega). `CI=true npm test -- --watchAll=false` sin fallos.
Commit (`git add` de los 8 archivos de la fase): `Worker: SMS programado a las 8:30 con LabsMobile y push del día por turnos`

---

## Fase 5 · App: celular, texto del push y cancelación del SMS

### 5A · Agente `datos-sms`

Archivos: `src/firebase/notificaciones.js`, `src/firebase/sms.js` (nuevo), `src/firebase/recurrentes.js`, `src/pwa/avisos.js`,
`src/__tests__/notificaciones.test.js`, `src/__tests__/recurrentes.test.js`, `src/__tests__/avisos.test.js`.

**5A.1 `src/firebase/notificaciones.js`.** `const zonaHoraria = () => {` pasa a `export const zonaHoraria = () => {`. En
`guardarPreferencias` añade `{ merge: true }` como tercer argumento de `setDoc` (para no borrar `celular` y `smsActivo`):

```js
//Perfil que lee el Worker: zona horaria (para saber qué día es «hoy») y si el aviso puede mostrar descripciones.
//Con merge: no borra el celular ni la preferencia de SMS (los guarda firebase/sms.js en el mismo documento).
export const guardarPreferencias = (uid, { detalleEnAviso }) =>
  esperarEscritura(setDoc(doc(db, "usuarios", uid), { zona: zonaHoraria(), detalleEnAviso: Boolean(detalleEnAviso), actualizado: serverTimestamp() }, { merge: true }));
```

En `src/__tests__/notificaciones.test.js` la expectativa
`expect(fs.setDoc).toHaveBeenCalledWith("usuarios/ana", expect.objectContaining({ detalleEnAviso: true, actualizado: "ahora", zona: expect.any(String) }));`
pasa a terminar en `…zona: expect.any(String) }), { merge: true });`.

**5A.2 `src/firebase/sms.js` (nuevo), completo:**

```js
import { db, auth } from "./firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import esperarEscritura from "./esperarEscritura";
import { zonaHoraria } from "./notificaciones";
import { urlApiClientes } from "./crearCliente";
import { hoyEnZona, ZONA_POR_DEFECTO } from "../functions/recurrencias";
import { enVentanaDeCancelacion } from "../functions/sms";

//Celular y preferencia de SMS en el perfil (usuarios/{uid}), con merge para no borrar lo de los avisos push.
//`celular` vacío = no se escribe: nunca se manda undefined a Firestore.
export const guardarSms = (uid, { celular, smsActivo, detalleEnAviso }) => {
  const datos = { zona: zonaHoraria(), detalleEnAviso: Boolean(detalleEnAviso), smsActivo: Boolean(smsActivo), actualizado: serverTimestamp() };
  if (celular) datos.celular = celular;
  return esperarEscritura(setDoc(doc(db, "usuarios", uid), datos, { merge: true }));
};

//Si quedó un SMS programado para las 8:30 y la persona acaba de registrar, omitir, pausar o borrar un gasto fijo que vencía
//hoy, se pide al Worker que lo cancele (solo él tiene las credenciales de LabsMobile). Solo entre las 8:00 y las 8:30 de
//Colombia: antes no hay nada programado y después el SMS ya salió. `proximaFecha` null = no se sabe (pausar, borrar). Nunca lanza.
export const pedirRevisionSms = async (proximaFecha) => {
  const base = urlApiClientes();
  if (!base || !auth.currentUser || !enVentanaDeCancelacion(new Date())) return;
  if (proximaFecha && proximaFecha !== hoyEnZona(ZONA_POR_DEFECTO)) return;
  try {
    const token = await auth.currentUser.getIdToken();
    await fetch(`${base}/sms/revisar`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
  } catch (e) {
    console.log(e);
  }
};
```

**5A.3 `src/firebase/recurrentes.js`.**

- Añade `import { pedirRevisionSms } from "./sms";` después del import de `./AgregarGasto`.
- Después de `const campos = …;` (el bloque completo) añade:

```js
//Tras un cambio ya sincronizado que puede dejar un SMS programado sin motivo, se pide revisarlo (sin esperar la respuesta)
const conRevisionSms = (promesa, proximaFecha) =>
  promesa.then((estado) => {
    if (estado === "sincronizado") pedirRevisionSms(proximaFecha);
    return estado;
  });
```

- `pausarRecurrente` pasa a:
  `export const pausarRecurrente = (id, activo) => (activo ? esperarEscritura(updateDoc(doc(db, "recurrentes", id), { activo })) : conRevisionSms(esperarEscritura(updateDoc(doc(db, "recurrentes", id), { activo })), null));`
- `borrarRecurrente` pasa a: `export const borrarRecurrente = (id) => conRevisionSms(esperarEscritura(deleteDoc(doc(db, "recurrentes", id))), null);`
- En `registrarPago`, `return esperarEscritura(lote.commit());` pasa a `return conRevisionSms(esperarEscritura(lote.commit()), recurrente.proximaFecha);`
- `omitirPago` pasa a:

```js
export const omitirPago = (recurrente) =>
  conRevisionSms(esperarEscritura(updateDoc(doc(db, "recurrentes", recurrente.id), { proximaFecha: siguienteFecha(recurrente, recurrente.proximaFecha) })), recurrente.proximaFecha);
```

En `src/__tests__/recurrentes.test.js`, después del `jest.mock("firebase/firestore", …)`, añade
`jest.mock("../firebase/sms", () => ({ pedirRevisionSms: jest.fn() }));`. Si otra prueba falla solo porque ahora importa
`firebase/sms` a través de `recurrentes.js`, añade esa misma línea en ese archivo de prueba (nada más) y repórtalo.

**5A.4 `src/pwa/avisos.js`.** En `armarNotificacion` reemplaza la línea
`const titulo = cantidad === 1 ? "Tienes un pago próximo" : \`Tienes ${cantidad} pagos próximos\`;` y el `return` siguiente por:

```js
  //El día del pago (hoy = "1") el aviso se repite por turnos hasta que la persona lo registre
  const hoy = datos.hoy === "1";
  const titulo = hoy
    ? cantidad === 1 ? "Hoy vence un pago" : `Hoy vencen ${cantidad} pagos`
    : cantidad === 1 ? "Tienes un pago próximo" : `Tienes ${cantidad} pagos próximos`;
  const detalle = limpiarTexto(datos.detalle);
  const porDefecto = hoy
    ? cantidad === 1 ? "Regístralo para dejar de recibir este aviso." : "Regístralos para dejar de recibir este aviso."
    : "Ábrela para ver cuándo vencen y registrar el pago.";
  return {
    titulo,
    opciones: {
      body: detalle || porDefecto,
      data: { url: rutaSegura(datos.url), cantidad },
    },
  };
```

(Borra la línea `const detalle = limpiarTexto(datos.detalle);` original para que no quede repetida.)

En `src/__tests__/avisos.test.js`, dentro del primer `describe`, añade:

```js
  test("el día del pago el título dice que vence hoy y pide registrarlo", () => {
    const uno = armarNotificacion(fcm({ tipo: "recordatorio", cantidad: "1", hoy: "1", url: "/recurrentes" }));
    expect(uno.titulo).toBe("Hoy vence un pago");
    expect(uno.opciones.body).toBe("Regístralo para dejar de recibir este aviso.");
    expect(armarNotificacion(fcm({ tipo: "recordatorio", cantidad: "3", hoy: "1" })).titulo).toBe("Hoy vencen 3 pagos");
  });
```

Comprobar: `CI=true npm test -- --watchAll=false`.

### 5B · Agente `ui-sms`

Archivos: `src/components/recurrentes/TarjetaSms.jsx` (nuevo), `src/components/recurrentes/TarjetaAvisos.jsx` (solo textos),
`src/components/paginas/PaginaRecurrentes.jsx`, `src/__tests__/TarjetaSms.test.jsx` (nuevo).

**5B.1 `src/components/recurrentes/TarjetaSms.jsx` (nuevo), completo:**

```jsx
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Interruptor from "../auth/Interruptor";
import { BotonPrincipal, Espera } from "../auth/elementos";
import { Etiqueta, Entrada, Ayuda } from "./elementos";
import { db, auth, doc, getDoc } from "../../firebase/firebaseConfig";
import { guardarSms } from "../../firebase/sms";
import { normalizarCelular } from "../../functions/sms";

let contador = 0;

const Tarjeta = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.9rem;
  padding: 1.1rem 1.15rem;
  border: 1px solid ${theme.borde};
  border-radius: 1.5rem;
  background: #fff;

  h2 {
    text-wrap: balance;
    font-size: 1.05rem;
    font-weight: 800;
    color: ${theme.tinta};
  }

  p {
    margin-top: 0.3rem;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: ${theme.tintaSuave};
  }
`;

const Icono = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.85rem;
  background: ${(p) => (p.$activo ? theme.verdeSuave : theme.violetaSuave)};
  color: ${(p) => (p.$activo ? theme.verdeTexto : "#3e4bc7")};
`;

const Mensaje = styled.p`
  &&& {
    color: ${(p) => (p.$error ? "#B42323" : theme.verdeTexto)};
    font-weight: 600;
  }
`;

const Burbuja = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
  </svg>
);

const ERROR_CELULAR = "Escribe tu celular de 10 dígitos (empieza por 3).";

//SMS el día de cada pago a las 8:30 a. m. (hora de Colombia). La persona escribe su celular y lo enciende (nace apagado).
//Lo envía el Worker (worker-recordatorios) con LabsMobile; el celular se guarda en usuarios/{uid}.
const TarjetaSms = () => {
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `sms-${++contador}`;
  const id = idBase.current;
  const [cargando, cambiarCargando] = useState(true);
  const [celular, cambiarCelular] = useState("");
  const [activo, cambiarActivo] = useState(false);
  const [detalleEnAviso, cambiarDetalleEnAviso] = useState(false);
  const [ocupado, cambiarOcupado] = useState(false);
  const [mensaje, cambiarMensaje] = useState(null);

  useEffect(() => {
    let vigente = true;
    if (!auth.currentUser) {
      cambiarCargando(false);
      return undefined;
    }
    getDoc(doc(db, "usuarios", auth.currentUser.uid))
      .then((d) => {
        if (!vigente || !d.exists()) return;
        const datos = d.data();
        if (typeof datos.celular === "string") cambiarCelular(datos.celular.replace(/^\+57/, ""));
        cambiarActivo(datos.smsActivo === true);
        cambiarDetalleEnAviso(datos.detalleEnAviso === true);
      })
      .catch((e) => console.log(e))
      .finally(() => {
        if (vigente) cambiarCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (cargando) return null;

  const guardar = async (e) => {
    e.preventDefault();
    cambiarMensaje(null);
    const normalizado = normalizarCelular(celular);
    if ((activo || celular.trim()) && !normalizado) return cambiarMensaje({ error: true, texto: ERROR_CELULAR });
    cambiarOcupado(true);
    try {
      await guardarSms(auth.currentUser.uid, { celular: normalizado, smsActivo: activo, detalleEnAviso });
      cambiarMensaje({ texto: activo ? "Listo: te enviaremos el SMS el día de cada pago." : "Guardado. No te enviaremos SMS." });
    } catch (error) {
      console.log(error);
      cambiarMensaje({ error: true, texto: "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      cambiarOcupado(false);
    }
  };

  return (
    <Tarjeta aria-labelledby={`${id}-titulo`} aria-busy={ocupado}>
      <Icono $activo={activo}>
        <Burbuja />
      </Icono>
      <form onSubmit={guardar} noValidate>
        <h2 id={`${id}-titulo`}>Recordatorio por SMS</h2>
        <p>El día de cada pago te enviamos un SMS a las 8:30 a. m. (hora de Colombia). Si lo registras antes, no te llega.</p>
        <div style={{ marginTop: "0.85rem" }}>
          <Etiqueta htmlFor={`${id}-celular`}>Celular</Etiqueta>
          <Entrada
            id={`${id}-celular`}
            name="celular"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="300 123 4567"
            maxLength={14}
            value={celular}
            onChange={(e) => {
              cambiarCelular(e.target.value.replace(/[^\d ]/g, ""));
              cambiarMensaje(null);
            }}
          />
          <Ayuda>Solo celulares de Colombia. Lo usamos únicamente para tus recordatorios.</Ayuda>
        </div>
        <div style={{ marginTop: "0.6rem" }}>
          <Interruptor
            id={`${id}-activo`}
            etiqueta="Recordarme por SMS"
            marcado={activo}
            alCambiar={(valor) => {
              cambiarActivo(valor);
              cambiarMensaje(null);
            }}
          />
        </div>
        <div style={{ marginTop: "0.85rem" }}>
          <BotonPrincipal type="submit" disabled={ocupado} style={{ width: "auto", padding: "0 1.25rem" }}>
            {ocupado ? <Espera aria-hidden="true" /> : null}
            Guardar
          </BotonPrincipal>
        </div>
        {mensaje && (
          <Mensaje role={mensaje.error ? "alert" : "status"} $error={mensaje.error}>
            {mensaje.texto}
          </Mensaje>
        )}
      </form>
    </Tarjeta>
  );
};

export default TarjetaSms;
```

**5B.2 `src/components/recurrentes/TarjetaAvisos.jsx`.** Solo los textos `disponible.cuerpo` y `activo.cuerpo`:

```jsx
    disponible: { titulo: "Avisos en este dispositivo", cuerpo: `Te avisamos ${DIAS_ANTES_AVISO} días antes y el día de cada pago, a las 8:30 a. m. y cada 3 horas hasta que lo registres, aunque la app esté cerrada.` },
    activo: { titulo: "Avisos activados", cuerpo: `Este dispositivo recibe los avisos ${DIAS_ANTES_AVISO} días antes y el día de cada pago (8:30 a. m. y cada 3 horas hasta que lo registres).` },
```

Si `src/__tests__/TarjetaAvisos.test.jsx` buscaba el texto viejo, actualiza solo esa cadena a la nueva y repórtalo.

**5B.3 `src/components/paginas/PaginaRecurrentes.jsx`.** Añade `import TarjetaSms from "../recurrentes/TarjetaSms";` después del import de
`TarjetaAvisos`. Cambia:

- el bloque móvil `<div style={{ marginTop: "1rem" }}><TarjetaAvisos /></div>` (dentro de `{!esEscritorio && (…)}`) para que quede:

```jsx
                <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
                  <TarjetaAvisos />
                  <TarjetaSms />
                </div>
```

- en `<Lateral>`, después de `<TarjetaAvisos siempre />` añade `{esEscritorio && <TarjetaSms />}` (así nunca hay dos tarjetas montadas a la vez).

**5B.4 Pruebas `src/__tests__/TarjetaSms.test.jsx` (nuevo):**

```jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TarjetaSms from "../components/recurrentes/TarjetaSms";
import { guardarSms } from "../firebase/sms";
import { getDoc } from "../firebase/firebaseConfig";

jest.mock("../firebase/firebaseConfig", () => ({ db: {}, auth: { currentUser: { uid: "ana" } }, doc: jest.fn(() => "usuarios/ana"), getDoc: jest.fn() }));
jest.mock("../firebase/sms", () => ({ guardarSms: jest.fn() }));

describe("TarjetaSms", () => {
  beforeEach(() => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ celular: "+573001234567", smsActivo: false, detalleEnAviso: true }) });
    guardarSms.mockResolvedValue("sincronizado");
  });

  test("muestra el celular guardado sin +57 y guarda al encender el SMS", async () => {
    render(<TarjetaSms />);
    const campo = await screen.findByLabelText("Celular");
    expect(campo).toHaveValue("3001234567");
    fireEvent.click(screen.getByLabelText("Recordarme por SMS"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(guardarSms).toHaveBeenCalledWith("ana", { celular: "+573001234567", smsActivo: true, detalleEnAviso: true }));
    expect(await screen.findByText("Listo: te enviaremos el SMS el día de cada pago.")).toBeInTheDocument();
  });

  test("no guarda un celular inválido", async () => {
    render(<TarjetaSms />);
    fireEvent.change(await screen.findByLabelText("Celular"), { target: { value: "300 12" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Escribe tu celular de 10 dígitos (empieza por 3).")).toBeInTheDocument();
    expect(guardarSms).not.toHaveBeenCalled();
  });
});
```

**5.5 Comprobar y cerrar (principal).** `CI=true npm test -- --watchAll=false` (+3 casos de esta fase), `CI=true npm run build`.
Commit (`git add` de los 11 archivos de 5A y 5B): `App: celular para SMS, aviso del día del pago y cancelación del SMS programado`

---

## Fase 6 · E2E, documentación y revisión

**6.1 `e2e/utilidades.js`.** En `documentosEnEmulador` cambia `v.stringValue ?? v.integerValue ?? v.doubleValue` por
`v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue`.

**6.2 `e2e/4-admin.spec.js`.** Cambia el `require` de utilidades para incluir `sembrarDocumento`. Antes del `});` final del `describe` añade:

```js
  test("ficha del cliente: pagos paginados, uso por mes, barra partida y «Dar días de prueba»", async ({ page }) => {
    const correo = correoUnico("historial");
    const uid = await crearCuenta(correo, { plan: "basico", diasVence: 10 });
    for (let i = 0; i < 7; i++) {
      await sembrarDocumento(`pagosPlan/e2e-${uid}-${i}`, { uidCliente: uid, correo, plan: "basico", monto: 60000, referencia: `Pago ${i + 1}`, fechaPago: new Date(Date.UTC(2026, i, 5)), venceDespues: new Date(Date.UTC(2026, i + 1, 5)), creado: new Date() });
    }
    const local = new Date(Date.now() - 5 * 3600000);
    await sembrarDocumento(`uso/${uid}_${local.getUTCFullYear()}_${local.getUTCMonth() + 1}`, { gastos: 10, fijos: 3, uidUsuario: uid });
    await sembrarDocumento(`uso/${uid}_2025_12`, { gastos: 4, uidUsuario: uid });
    await registrarUsuario(page, correoUnico("admin4"), { admin: true });

    await page.getByLabel("Buscar cliente por correo o nombre").fill(correo);
    await page.getByRole("button", { name: correo }).click();
    const detalle = page.getByRole("dialog");
    await expect(detalle.getByRole("meter", { name: "Gastos del mes" })).toHaveAttribute("aria-valuetext", "10 de 30: 7 variables y 3 fijos");
    await expect(detalle.getByText("Diciembre de 2025")).toBeVisible();

    //5 por página, más recientes primero: el pago 7 está en la página 1 y el 2 en la 2
    await expect(detalle.getByText(/^Pago 7 ·/)).toBeVisible();
    await expect(detalle.getByText(/^Pago 2 ·/)).toHaveCount(0);
    const paginas = detalle.getByRole("navigation", { name: "Páginas de pagos" });
    await paginas.getByRole("button", { name: "Anteriores" }).click();
    await expect(paginas.getByText("Página 2 de 2")).toBeVisible();
    await expect(detalle.getByText(/^Pago 2 ·/)).toBeVisible();

    await detalle.getByRole("button", { name: "Dar días de prueba" }).click();
    const hoja = page.getByRole("dialog", { name: "Dar días de prueba" });
    await hoja.getByLabel("Días").fill("15");
    await hoja.getByRole("button", { name: "Dar días" }).click();
    await expect(hoja).toBeHidden();
    const pagos = await documentosEnEmulador("pagosPlan");
    expect(pagos.find((p) => p.correo === correo && p.referencia === "Días de prueba (15)")).toMatchObject({ monto: "0" });
  });
```

(Si `sembrarDocumento` no convierte `Date` a `timestampValue`, **para**: `valorFs` en `utilidades.js` sí lo hace al escribir el plan.
`integerValue` llega como texto: por eso `monto: "0"`.)

**6.3 `e2e/4-sms.spec.js` (nuevo):**

```js
const { test, expect } = require("@playwright/test");
const { correoUnico, registrarUsuario, irA, documentosEnEmulador } = require("./utilidades");

test("el cliente guarda su celular y enciende el SMS del día del pago", async ({ page }) => {
  const correo = correoUnico("sms");
  await registrarUsuario(page, correo);
  await irA(page, "Gastos fijos");
  const tarjeta = page.getByRole("region", { name: "Recordatorio por SMS" });
  await tarjeta.getByLabel("Celular").fill("300 123 45");
  await tarjeta.getByRole("button", { name: "Guardar" }).click();
  await expect(tarjeta.getByText("Escribe tu celular de 10 dígitos (empieza por 3).")).toBeVisible();
  await tarjeta.getByLabel("Celular").fill("300 123 4567");
  await tarjeta.getByText("Recordarme por SMS").click();
  await tarjeta.getByRole("button", { name: "Guardar" }).click();
  await expect(tarjeta.getByText("Listo: te enviaremos el SMS el día de cada pago.")).toBeVisible();
  const perfil = (await documentosEnEmulador("usuarios")).find((p) => p.celular === "+573001234567");
  expect(perfil).toMatchObject({ smsActivo: true });
});
```

**6.4 Correr.** `PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH npm run e2e` (antes 44; ahora **46**, 0 fallos). Si falla algo que no es de estas pruebas, para y di cuál.

**6.5 `CLAUDE.md`.** Actualiza (textos exactos):

- En «Comandos», `44 pruebas:` → `46 pruebas:` y `101 pruebas de firestore.rules` → `105 pruebas de firestore.rules`.
- En «Pagos recurrentes y avisos», añade al final del párrafo: `El día del pago el push se repite a las 8:30, 11:30, 14:30 y 17:30 (turnos de turnoDelDia; clave «fecha:hoy:N») hasta que se registre, omita, pause o borre. SMS: ver «SMS (LabsMobile)».`
- En «Planes, clientes y límites», añade: `uso.fijos cuenta los pagos de gastos fijos del mes (barra partida en /admin con MedidorPartido); la ficha del cliente pagina pagos (5) y uso por mes (6) con paginar(). Días de prueba: campo al crear/pasar a Prueba (1–90, diasDePrueba) y «Dar días de prueba» (darDiasPrueba, asiento de $0).`

**6.6 Revisor.** Lanza el agente `revisor` (§3) y corrige solo lo que el plan pida. Commit (`git add e2e/utilidades.js e2e/4-admin.spec.js e2e/4-sms.spec.js CLAUDE.md`):
`E2E y documentación de historial, días de prueba y SMS`

**PARAR AQUÍ.** Reporta las cifras finales (Jest, Worker, reglas, E2E) y el informe del revisor. No hagas push ni merge.

---

## Fuera de alcance (no lo hagas)

- Recontar `fijos` de meses anteriores (salen con 0 fijos).
- Paginación en Firestore (`limit`/`startAfter`) o índices nuevos.
- SMS a números fuera de Colombia, SMS «3 días antes» o de mora, SMS de vencimiento de plan, cupo de SMS por plan, plantillas editables.
- Ver los gastos o los gastos fijos de un cliente desde `/admin` (privacidad: solo conteos).
- Cambiar los textos de la pantalla `/plan` o los planes y precios.
- Desplegar nada; tocar `.env`, `.dev.vars` o credenciales.

## Lo que hace el dueño

1. Revisar el plan y, al final, el diff.
2. **Desplegar reglas** (tras la Fase 1, antes de la vista previa): `PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH firebase deploy --only firestore:rules`.
3. Vista previa tras la Fase 3 y la 5: `npm run build && PATH=$HOME/.nvm/versions/node/v22.19.0/bin:$PATH firebase hosting:channel:deploy admin-prueba-sms --expires 7d` (usa el Firestore real).
4. **Secretos del Worker** (nunca en el repo ni en `.env`): `cd worker-recordatorios && npx wrangler secret put LABS_MOBILE_USER` (correo de la cuenta de LabsMobile) y `npx wrangler secret put LABS_MOBILE_TOKEN` (token de «Configuración API»). Para `wrangler dev` en local van en `worker-recordatorios/.dev.vars` (ignorado por git).
5. **Desplegar el Worker**: actualizar `compatibility_date` a la fecha del día, `npm test` y `npx wrangler deploy`. Comprobar en el panel de Cloudflare que aparezcan los dos crons.
6. **Prueba real del SMS programado** (no se puede en modo test: code 41): con tu propia cuenta de cliente, celular y «Recordarme por SMS» encendido, crea un gasto fijo que venza mañana. Al día siguiente a las 8:00 revisa en el panel de LabsMobile → Historial/Programados que aparezca el envío con subid `f…AAAAMMDD` para las 13:30 GMT. Para probar la cancelación (LabsMobile confirmó que se cancela con el mismo `subid`), regístralo entre las 8:00 y las 8:30 y verifica que desaparezca de Programados y que en Firestore `clientes/{tu uid}.ultimoSms` termine en `|cancelado`. Revisa también si el remitente sale con tu nombre o con un código corto del operador.
7. Desplegar Hosting y hacer merge cuando todo esté bien.
