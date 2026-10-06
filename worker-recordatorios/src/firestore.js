//Firestore por REST (el Worker no puede usar firebase-admin). La cuenta de servicio se salta las reglas de seguridad.
export const urlBase = (env) => env.FIRESTORE_BASE || "https://firestore.googleapis.com";
const raiz = (env) => `projects/${env.GCP_PROJECT_ID}/databases/(default)/documents`;

//Valor tipado de Firestore → valor JS
export const leerValor = (v) => {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, leerValor(x)]));
  return null;
};
export const leerDocumento = (doc) => ({
  id: doc.name.split("/").pop(),
  ruta: doc.name,
  ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, leerValor(v)])),
});

const llamar = async (env, token, pedir, camino, cuerpo) => {
  const respuesta = await pedir(`${urlBase(env)}/v1/${camino}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!respuesta.ok) throw new Error(`Firestore ${respuesta.status}`); //sin el cuerpo: puede traer datos
  return respuesta.json();
};

const consulta = async (env, token, pedir, structuredQuery) => {
  const filas = await llamar(env, token, pedir, `${raiz(env)}:runQuery`, { structuredQuery });
  return filas.filter((f) => f.document).map((f) => leerDocumento(f.document));
};

//Pagos activos con vencimiento dentro de la ventana [desde, hasta] (AAAA-MM-DD)
export const pagosEnVentana = (env, token, pedir, desde, hasta) => consulta(env, token, pedir, {
  from: [{ collectionId: "recurrentes" }],
  where: { compositeFilter: { op: "AND", filters: [
    { fieldFilter: { field: { fieldPath: "activo" }, op: "EQUAL", value: { booleanValue: true } } },
    { fieldFilter: { field: { fieldPath: "proximaFecha" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: desde } } },
    { fieldFilter: { field: { fieldPath: "proximaFecha" }, op: "LESS_THAN_OR_EQUAL", value: { stringValue: hasta } } },
  ] } },
  limit: 500,
});

//¿Existe el documento `ruta` (p. ej. «super_admins/uid»)?
export const existeDocumento = async (env, token, pedir, ruta) => {
  const respuesta = await pedir(`${urlBase(env)}/v1/${raiz(env)}/${ruta}`, { headers: { Authorization: `Bearer ${token}` } });
  if (respuesta.status === 404) return false;
  if (!respuesta.ok) throw new Error(`Firestore ${respuesta.status}`);
  return true;
};

//Crea clientes/{uid} (falla si ya existe) con el formato que validan las reglas
export const crearDocumentoCliente = (env, token, pedir, uid, c) => {
  const campos = {
    correo: { stringValue: c.correo },
    plan: { stringValue: c.plan },
    estado: { stringValue: c.estado },
    vence: { timestampValue: c.vence },
    limites: { mapValue: { fields: Object.fromEntries(Object.entries(c.limites).map(([k, v]) => [k, { integerValue: String(v) }])) } },
    creado: { timestampValue: c.ahora },
    actualizado: { timestampValue: c.ahora },
  };
  if (c.nombre) campos.nombre = { stringValue: c.nombre };
  if (c.notas) campos.notas = { stringValue: c.notas };
  return llamar(env, token, pedir, `${raiz(env)}:commit`, { writes: [{ update: { name: `${raiz(env)}/clientes/${uid}`, fields: campos }, currentDocument: { exists: false } }] });
};

//Todos los clientes (planes) y los super admins: pocas decenas de documentos, una llamada cada uno
export const todosLosClientes = (env, token, pedir) => consulta(env, token, pedir, { from: [{ collectionId: "clientes" }], limit: 500 });
export const superAdmins = (env, token, pedir) => consulta(env, token, pedir, { from: [{ collectionId: "super_admins" }], limit: 20 });

//Perfiles (zona horaria, preferencias) de varias personas en una sola llamada
export const perfiles = async (env, token, pedir, uids) => {
  if (!uids.length) return {};
  const filas = await llamar(env, token, pedir, `${raiz(env)}:batchGet`, { documents: uids.map((u) => `${raiz(env)}/usuarios/${u}`) });
  return Object.fromEntries(filas.filter((f) => f.found).map((f) => { const d = leerDocumento(f.found); return [d.id, d]; }));
};

//Tokens de dispositivos (colección de grupo «tokens»), los más recientes primero; `uid` sale de la ruta
//usuarios/{uid}/tokens/{id}. El orden usa el índice de grupo de `tokens.actualizado` (firestore.indexes.json).
export const todosLosTokens = async (env, token, pedir) => {
  const docs = await consulta(env, token, pedir, {
    from: [{ collectionId: "tokens", allDescendants: true }],
    orderBy: [{ field: { fieldPath: "actualizado" }, direction: "DESCENDING" }],
    limit: 500,
  });
  return docs.map((d) => ({ ...d, uid: d.ruta.split("/usuarios/")[1].split("/")[0] }));
};

//Escrituras del ciclo en una sola llamada: marcar avisos enviados (en `campo`, por defecto `ultimoAviso`) y borrar tokens inválidos
export const confirmar = (env, token, pedir, { avisos, tokensABorrar }) => {
  const writes = [
    ...avisos.map(({ ruta, clave, campo = "ultimoAviso" }) => ({
      update: { name: ruta, fields: { [campo]: { stringValue: clave } } },
      updateMask: { fieldPaths: [campo] },
      currentDocument: { exists: true },
    })),
    ...tokensABorrar.map((ruta) => ({ delete: ruta })),
  ];
  return writes.length ? llamar(env, token, pedir, `${raiz(env)}:commit`, { writes }) : null;
};
