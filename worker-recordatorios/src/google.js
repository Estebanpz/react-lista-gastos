//Acceso a las APIs de Google desde un Worker sin librerías: JWT RS256 firmado con WebCrypto →
//access token OAuth2 de la cuenta de servicio. Docs: developers.google.com/identity/protocols/oauth2/service-account
const SCOPES = "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/identitytoolkit";
const URL_TOKEN = "https://oauth2.googleapis.com/token";

const base64url = (datos) => {
  const bytes = typeof datos === "string" ? new TextEncoder().encode(datos) : new Uint8Array(datos);
  let texto = "";
  for (const b of bytes) texto += String.fromCharCode(b);
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const importarClave = (pem) => {
  const cuerpo = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(cuerpo), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
};

export const firmarJWT = async (cuenta, ahoraSeg) => {
  const cabecera = base64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: cuenta.private_key_id }));
  const datos = base64url(JSON.stringify({ iss: cuenta.client_email, scope: SCOPES, aud: URL_TOKEN, iat: ahoraSeg, exp: ahoraSeg + 3000 }));
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await importarClave(cuenta.private_key), new TextEncoder().encode(`${cabecera}.${datos}`));
  return `${cabecera}.${datos}.${base64url(firma)}`;
};

export const obtenerAccessToken = async (cuenta, { fetch: pedir = fetch, ahoraSeg = Math.floor(Date.now() / 1000) } = {}) => {
  const respuesta = await pedir(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await firmarJWT(cuenta, ahoraSeg) }),
  });
  if (!respuesta.ok) throw new Error(`OAuth ${respuesta.status}`); //sin el cuerpo: podría eco de datos
  return (await respuesta.json()).access_token;
};
