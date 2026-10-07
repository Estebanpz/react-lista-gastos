import React, { useEffect, useRef, useState } from "react";
import Hoja from "../Hoja";
import { BotonPrincipal, Espera, MensajeError, MensajeExito } from "../auth/elementos";
import { Formulario, Etiqueta, Grupo, Entrada, Seleccion, Ayuda } from "../recurrentes/elementos";
import { PLANES, IDS_PLAN, CLAVES_LIMITE, ETIQUETAS_LIMITE, limitesDePlan } from "../../functions/planes";
import { asignarPlan, actualizarCliente } from "../../firebase/clientes";
import FormatearCantidad from "../../functions/ConvertirAMoneda";
import { crearClienteConAcceso, urlApiClientes } from "../../firebase/crearCliente";
import { BotonSecundario } from "../recurrentes/elementos";

let contador = 0;

//Alta (cliente nuevo, con el uid copiado de la consola de Firebase) o edición (nombre, plan, notas y cupo a medida).
//`cliente` null = alta. `alCerrar(guardado)` recibe true si se guardó.
const HojaPlanCliente = ({ abierta, cliente, alCerrar }) => {
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `plan-${++contador}`;
  const id = idBase.current;
  const editando = Boolean(cliente);

  const [uid, cambiarUid] = useState("");
  const [correo, cambiarCorreo] = useState("");
  const [nombre, cambiarNombre] = useState("");
  const [plan, cambiarPlan] = useState("basico");
  const [cupos, cambiarCupos] = useState({}); //cupos a medida (texto); vacío = el del plan
  const [notas, cambiarNotas] = useState("");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);
  const [creado, cambiarCreado] = useState(null); //resultado de crear con acceso: {correo, enlace, correoEnviado}
  const [copiado, cambiarCopiado] = useState(false);
  const conApi = Boolean(urlApiClientes());

  useEffect(() => {
    if (!abierta) return;
    cambiarUid(cliente ? cliente.uid : "");
    cambiarCorreo(cliente ? cliente.correo : "");
    cambiarNombre(cliente ? cliente.nombre || "" : "");
    cambiarPlan(cliente ? cliente.plan : "basico");
    //Solo se muestra como «a medida» el cupo del cliente que difiere del plan
    cambiarCupos(
      cliente
        ? Object.fromEntries(CLAVES_LIMITE.filter((k) => cliente.limites[k] !== PLANES[cliente.plan].limites[k]).map((k) => [k, String(cliente.limites[k])]))
        : {}
    );
    cambiarNotas(cliente ? cliente.notas || "" : "");
    cambiarError("");
    cambiarEnviando(false);
    cambiarCreado(null);
    cambiarCopiado(false);
  }, [abierta, cliente]);

  const guardar = async (e) => {
    e.preventDefault();
    //Con el servidor configurado y sin UID se crea la cuenta completa; con UID solo se asigna el plan a una cuenta que ya existe
    const crearConAcceso = !editando && conApi && !uid.trim();
    if (!editando && !crearConAcceso && (uid.trim().length < 20 || /\s/.test(uid.trim()))) return cambiarError("Pega el UID de la cuenta tal como aparece en Firebase → Authentication.");
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) return cambiarError("Escribe un correo válido.");
    //Cupos a medida: solo los que se llenaron, enteros mayores que 0
    const extras = {};
    for (const k of CLAVES_LIMITE) {
      const texto = (cupos[k] || "").trim();
      if (texto === "") continue;
      const n = Number(texto);
      if (!Number.isInteger(n) || n < 1) return cambiarError(`El cupo de «${ETIQUETAS_LIMITE[k]}» debe ser un número entero mayor que 0, o déjalo vacío.`);
      extras[k] = n;
    }
    const hayExtras = Object.keys(extras).length > 0;
    cambiarEnviando(true);
    try {
      if (editando) {
        //Cambiar de plan cambia los límites; el cupo a medida (si hay) se aplica encima
        const limites = limitesDePlan(plan, extras);
        await actualizarCliente(cliente.uid, { nombre, notas, plan, limites, estado: cliente.estado === "suspendido" ? undefined : plan === "prueba" ? "prueba" : "activo" });
      } else if (crearConAcceso) {
        const r = await crearClienteConAcceso({ correo, nombre, plan, notas });
        if (hayExtras) await actualizarCliente(r.uid, { limites: limitesDePlan(plan, extras) });
        cambiarCreado({ correo: correo.trim().toLowerCase(), ...r });
        cambiarEnviando(false);
        return;
      } else {
        await asignarPlan({ uid, correo, nombre, plan, notas });
        if (hayExtras) await actualizarCliente(uid.trim(), { limites: limitesDePlan(plan, extras) });
      }
      alCerrar(true);
    } catch (err) {
      console.log(err);
      cambiarError(err && err.message && !err.code ? err.message : err && err.code === "permission-denied" ? "Sin permiso: solo el super admin puede guardar planes." : "No pudimos guardar. Revisa los datos e inténtalo de nuevo.");
      cambiarEnviando(false);
    }
  };

  const mensajeAcceso = creado && `Hola, ya tienes acceso a Finanzas. Entra a https://finanzas.zfmanager.com y crea tu contraseña con este enlace: ${creado.enlace}`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(creado.enlace);
      cambiarCopiado(true);
    } catch (e) {
      cambiarCopiado(false);
    }
  };

  if (creado) {
    return (
      <Hoja abierta={abierta} alCerrar={() => alCerrar(true)} titulo="Cliente creado" subtitulo={creado.correo}>
        <Formulario as="div">
          <MensajeExito role="status">
            Listo: la cuenta y el plan quedaron creados. {creado.correoEnviado ? "Le enviamos un correo para que cree su contraseña (revisa que no caiga en spam)." : "No pudimos enviar el correo; comparte el enlace."}
          </MensajeExito>
          {creado.enlace && (
            <>
              <Ayuda>También puedes compartirle este enlace para crear su contraseña:</Ayuda>
              <BotonSecundario type="button" onClick={copiar}>{copiado ? "Enlace copiado" : "Copiar enlace"}</BotonSecundario>
              <BotonSecundario as="a" href={`https://wa.me/?text=${encodeURIComponent(mensajeAcceso)}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                Enviar por WhatsApp
              </BotonSecundario>
            </>
          )}
          <BotonPrincipal type="button" onClick={() => alCerrar(true)}>Listo</BotonPrincipal>
        </Formulario>
      </Hoja>
    );
  }

  return (
    <Hoja abierta={abierta} alCerrar={() => alCerrar(false)} titulo={editando ? "Cambiar plan" : conApi ? "Nuevo cliente" : "Asignar plan"} subtitulo={editando ? cliente.correo : conApi ? "Crea su acceso y le asigna el plan." : "Para una cuenta que ya creaste en Firebase Console."}>
      <Formulario onSubmit={guardar} noValidate aria-busy={enviando}>
        {!editando && (
          <div>
            <Etiqueta htmlFor={`${id}-uid`}>{conApi ? "UID de una cuenta que ya existe (opcional)" : "UID de la cuenta"}</Etiqueta>
            <Entrada id={`${id}-uid`} name="uid" autoComplete="off" spellCheck={false} value={uid} onChange={(e) => cambiarUid(e.target.value)} />
            <Ayuda>{conApi ? "Déjalo vacío para crear la cuenta nueva. Pega el UID solo si la cuenta ya existe (Authentication → «UID de usuario»)." : "Firebase Console → Authentication → columna «UID de usuario»."}</Ayuda>
          </div>
        )}
        <div>
          <Etiqueta htmlFor={`${id}-correo`}>Correo</Etiqueta>
          <Entrada id={`${id}-correo`} name="correo" type="email" autoComplete="off" value={correo} disabled={editando} onChange={(e) => cambiarCorreo(e.target.value)} />
        </div>
        <div>
          <Etiqueta htmlFor={`${id}-nombre`}>Nombre (opcional)</Etiqueta>
          <Entrada id={`${id}-nombre`} name="nombre" autoComplete="off" maxLength={60} value={nombre} onChange={(e) => cambiarNombre(e.target.value)} />
        </div>
        <div>
          <Etiqueta htmlFor={`${id}-plan`}>Plan</Etiqueta>
          <Seleccion id={`${id}-plan`} name="plan" value={plan} onChange={(e) => cambiarPlan(e.target.value)}>
            {IDS_PLAN.map((p) => (
              <option key={p} value={p}>
                {PLANES[p].nombre} · {PLANES[p].precio ? `${FormatearCantidad(PLANES[p].precio)}/mes` : "gratis"}
              </option>
            ))}
          </Seleccion>
          <Ayuda>{PLANES[plan].limites.gastosMes.toLocaleString("es-CO")} gastos variables al mes, {PLANES[plan].limites.pagosActivos} gastos fijos (pagos), {PLANES[plan].limites.categorias} categorías propias.</Ayuda>
        </div>
        <Grupo>
          <Etiqueta as="legend">Cupos a medida (opcional)</Etiqueta>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))", gap: "0.85rem" }}>
            {CLAVES_LIMITE.map((k) => (
              <div key={k}>
                <Etiqueta htmlFor={`${id}-cupo-${k}`} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.875rem" }}>{ETIQUETAS_LIMITE[k]}</Etiqueta>
                <Entrada
                  id={`${id}-cupo-${k}`}
                  name={`cupo-${k}`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={`Plan: ${PLANES[plan].limites[k]}`}
                  value={cupos[k] || ""}
                  onChange={(e) => cambiarCupos({ ...cupos, [k]: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            ))}
          </div>
          <Ayuda>Para cuando negocias cantidades distintas a las del plan. Vacío = el cupo del plan. Solo tú puedes fijarlos.</Ayuda>
        </Grupo>
        <div>
          <Etiqueta htmlFor={`${id}-notas`}>Notas (opcional)</Etiqueta>
          <Entrada id={`${id}-notas`} name="notas" autoComplete="off" maxLength={200} value={notas} onChange={(e) => cambiarNotas(e.target.value)} />
        </div>
        {error && <MensajeError role="alert">{error}</MensajeError>}
        <BotonPrincipal type="submit" disabled={enviando}>
          {enviando ? <Espera aria-hidden="true" /> : null}
          {editando ? "Guardar cambios" : conApi && !uid.trim() ? "Crear cliente" : "Asignar plan"}
        </BotonPrincipal>
      </Formulario>
    </Hoja>
  );
};

export default HojaPlanCliente;
