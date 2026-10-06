//Verificación de un ID token de Firebase Auth dentro del Worker (sin librerías): firma RS256 con las claves públicas
//de Google (JWK) y comprobación de emisor, audiencia y caducidad. Docs: firebase.google.com/docs/auth/admin/verify-id-tokens
const URL_CLAVES = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const aBytes = (b64url) => Uint8Array.from(atob(b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64url.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const leerJSON = (b64url) => JSON.parse(new TextDecoder().decode(aBytes(b64url)));

//Devuelve el uid (y correo) si el token es válido; lanza Error con mensaje corto si no
export const verificarIdToken = async (token, env, pedir = fetch, ahoraSeg = Math.floor(Date.now() / 1000)) => {
  const partes = typeof token === "string" ? token.split(".") : [];
  if (partes.length !== 3) throw new Error("token-malformado");
  let cabecera;
  let carga;
  try {
    cabecera = leerJSON(partes[0]);
    carga = leerJSON(partes[1]);
  } catch {
    throw new Error("token-malformado");
  }
  if (cabecera.alg !== "RS256" || !cabecera.kid) throw new Error("token-algoritmo");

  const respuesta = await pedir(env.URL_CLAVES_TOKEN || URL_CLAVES);
  if (!respuesta.ok) throw new Error("claves-no-disponibles");
  const clave = (await respuesta.json()).keys?.find((k) => k.kid === cabecera.kid);
  if (!clave) throw new Error("token-clave-desconocida");
  const importada = await crypto.subtle.importKey("jwk", clave, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valida = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", importada, aBytes(partes[2]), new TextEncoder().encode(`${partes[0]}.${partes[1]}`));
  if (!valida) throw new Error("token-firma");

  if (carga.aud !== env.GCP_PROJECT_ID || carga.iss !== `https://securetoken.google.com/${env.GCP_PROJECT_ID}`) throw new Error("token-proyecto");
  if (!(carga.exp > ahoraSeg) || carga.iat > ahoraSeg + 60) throw new Error("token-caducado");
  if (typeof carga.sub !== "string" || !carga.sub) throw new Error("token-sin-sujeto");
  return { uid: carga.sub, correo: carga.email || "" };
};
