//Envío por FCM HTTP v1. Solo `data` (sin `notification`): el service worker de la app arma el texto.
export const enviarPush = async (env, accessToken, pedir, tokenDispositivo, datos) => {
  const respuesta = await pedir(`https://fcm.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: {
      token: tokenDispositivo,
      data: datos,
      webpush: { headers: { TTL: "86400", Urgency: "normal", Topic: "recordatorios" } },
    } }),
  });
  if (respuesta.ok) return { ok: true };
  let codigo = "";
  try { codigo = (await respuesta.json()).error?.details?.find((d) => d.errorCode)?.errorCode || ""; } catch { /* sin cuerpo */ }
  //Token muerto o malformado: hay que borrarlo. El resto (5xx, cuota) se reintenta en la siguiente ejecución.
  return { ok: false, estado: respuesta.status, invalido: codigo === "UNREGISTERED" || codigo === "INVALID_ARGUMENT" || respuesta.status === 404 };
};
