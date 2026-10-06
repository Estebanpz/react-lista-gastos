//API mínima para el panel de super admin. Hoy una sola operación: crear un cliente (cuenta de acceso + plan).
//El navegador no puede crear cuentas (el registro está cerrado), así que lo hace el Worker con la cuenta de servicio,
//y solo para quien lleve un ID token válido Y esté en `super_admins`. Nunca se registran correos, ids ni tokens.
import { obtenerAccessToken } from "./google.js";
import { verificarIdToken } from "./token.js";
import { existeDocumento, crearDocumentoCliente } from "./firestore.js";
import { PLANES, limitesDePlan, nuevoVencimiento } from "../../src/functions/planes.js";

const ORIGENES_POR_DEFECTO = ["https://finanzas.zfmanager.com", "https://react-lista-gastos-5d794.web.app", "https://react-lista-gastos-5d794.firebaseapp.com"];
const origenesPermitidos = (env) => (env.ORIGENES_PERMITIDOS ? env.ORIGENES_PERMITIDOS.split(",").map((o) => o.trim()) : ORIGENES_POR_DEFECTO);
//Las vistas previas de Firebase Hosting (…--canal-hash.web.app) del mismo proyecto también pueden usar el panel
const esVistaPrevia = (origen, env) => new RegExp(`^https://${env.GCP_PROJECT_ID}--[a-z0-9-]+\\.web\\.app$`).test(origen);

const cabecerasCors = (request, env) => {
  const origen = request.headers.get("Origin") || "";
  const permitido = origenesPermitidos(env).includes(origen) || esVistaPrevia(origen, env);
  return permitido
    ? { "Access-Control-Allow-Origin": origen, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "600", Vary: "Origin" }
    : { Vary: "Origin" };
};

const responder = (request, env, estado, cuerpo) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cabecerasCors(request, env) } });

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const contrasenaAleatoria = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let t = "";
  for (const b of bytes) t += String.fromCharCode(b);
  return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const baseIdentidad = (env) => env.IDENTITY_BASE || "https://identitytoolkit.googleapis.com";

//Valida el cuerpo de «crear cliente»; devuelve {datos} o {error}
export const validarNuevoCliente = (cuerpo) => {
  const correo = typeof cuerpo?.correo === "string" ? cuerpo.correo.trim().toLowerCase() : "";
  if (!CORREO.test(correo) || correo.length > 120) return { error: "correo-invalido" };
  if (!PLANES[cuerpo.plan]) return { error: "plan-invalido" };
  const nombre = typeof cuerpo.nombre === "string" ? cuerpo.nombre.trim() : "";
  const notas = typeof cuerpo.notas === "string" ? cuerpo.notas.trim() : "";
  if (nombre.length > 60 || notas.length > 200) return { error: "texto-muy-largo" };
  return { datos: { correo, plan: cuerpo.plan, nombre, notas } };
};

export const manejarSolicitud = async (request, env, { fetch: pedir = fetch, ahora = new Date() } = {}) => {
  const { pathname } = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cabecerasCors(request, env) });
  if (request.method !== "POST" || pathname !== "/clientes") return responder(request, env, 404, { error: "no-encontrado" });

  //1) ¿Quién llama? ID token válido de Firebase Auth
  let quien;
  try {
    quien = await verificarIdToken((request.headers.get("Authorization") || "").replace(/^Bearer /, ""), env, pedir, Math.floor(ahora.getTime() / 1000));
  } catch (e) {
    return responder(request, env, 401, { error: "no-autenticado" });
  }

  const cuenta = JSON.parse(env.GOOGLE_SA_JSON);
  const accessToken = await obtenerAccessToken(cuenta, { fetch: pedir, ahoraSeg: Math.floor(ahora.getTime() / 1000) });

  //2) ¿Es super admin? La comprobación es contra Firestore (la fuente de verdad), no contra algo que mande el cliente
  if (!(await existeDocumento(env, accessToken, pedir, `super_admins/${quien.uid}`))) return responder(request, env, 403, { error: "sin-permiso" });

  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return responder(request, env, 400, { error: "cuerpo-invalido" });
  }
  const { datos, error } = validarNuevoCliente(cuerpo);
  if (error) return responder(request, env, 400, { error });

  //3) Crea la cuenta de acceso con una contraseña aleatoria que nadie ve: la persona define la suya con el enlace
  const crear = await pedir(`${baseIdentidad(env)}/v1/projects/${env.GCP_PROJECT_ID}/accounts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: datos.correo, password: contrasenaAleatoria(), displayName: datos.nombre || undefined, emailVerified: false }),
  });
  if (!crear.ok) {
    let codigo = "";
    try { codigo = (await crear.json()).error?.message || ""; } catch { /* sin cuerpo */ }
    return codigo.startsWith("EMAIL_EXISTS") ? responder(request, env, 409, { error: "correo-existe" }) : responder(request, env, 502, { error: "no-se-pudo-crear-la-cuenta" });
  }
  const { localId: uid } = await crear.json();

  //4) Documento del plan (mismo formato que valida firestore.rules)
  const plan = PLANES[datos.plan];
  const vence = new Date(nuevoVencimiento(null, plan.dias, ahora.getTime())).toISOString();
  await crearDocumentoCliente(env, accessToken, pedir, uid, {
    correo: datos.correo, nombre: datos.nombre, notas: datos.notas, plan: datos.plan, estado: datos.plan === "prueba" ? "prueba" : "activo",
    vence, limites: limitesDePlan(datos.plan), ahora: ahora.toISOString(),
  });

  //5) Enlace para que la persona cree su contraseña (el administrador puede enviarlo por WhatsApp)
  let enlace = null;
  const oob = await pedir(`${baseIdentidad(env)}/v1/accounts:sendOobCode`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email: datos.correo, returnOobLink: true }),
  });
  if (oob.ok) enlace = (await oob.json()).oobLink || null;

  console.log(JSON.stringify({ evento: "cliente-creado", plan: datos.plan, enlace: Boolean(enlace) }));
  return responder(request, env, 201, { uid, enlace });
};
