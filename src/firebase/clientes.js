import { db } from "./firebaseConfig";
import { doc, collection, setDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } from "firebase/firestore";
import { PLANES, limitesDePlan, nuevoVencimiento } from "../functions/planes";

//Escrituras del super admin sobre `clientes` y `pagosPlan`. Solo funcionan con `super_admins/{uid}` (las reglas lo exigen);
//la interfaz solo es comodidad. El cliente nunca escribe su plan.

const aTimestamp = (ms) => Timestamp.fromMillis(ms);

//Alta de un plan para una cuenta ya creada en la consola de Firebase (el uid se copia de allí)
export const asignarPlan = ({ uid, correo, nombre, plan, dias, notas }) => {
  const datos = {
    correo: correo.trim(),
    plan,
    estado: plan === "prueba" ? "prueba" : "activo",
    vence: aTimestamp(nuevoVencimiento(null, dias || PLANES[plan].dias)),
    limites: limitesDePlan(plan),
    creado: serverTimestamp(),
    actualizado: serverTimestamp(),
  };
  if (nombre && nombre.trim()) datos.nombre = nombre.trim();
  if (notas && notas.trim()) datos.notas = notas.trim();
  return setDoc(doc(db, "clientes", uid.trim()), datos);
};

//Cambia datos del cliente sin tocar `creado`. `limites` solo se envía si el admin fijó cupos a medida.
export const actualizarCliente = (uid, { nombre, plan, estado, notas, limites, vence }) => {
  const cambios = { actualizado: serverTimestamp() };
  if (nombre !== undefined) cambios.nombre = nombre.trim();
  if (notas !== undefined) cambios.notas = notas.trim();
  if (plan) cambios.plan = plan;
  if (estado) cambios.estado = estado;
  if (limites) cambios.limites = limites;
  if (vence) cambios.vence = aTimestamp(vence);
  return updateDoc(doc(db, "clientes", uid), cambios);
};

//Suspender corta el registro de datos (las reglas lo hacen cumplir); reactivar vuelve al estado según el plan
export const suspenderCliente = (cliente, suspender) =>
  actualizarCliente(cliente.uid, { estado: suspender ? "suspendido" : cliente.plan === "prueba" ? "prueba" : "activo" });

//Registra un pago: asiento en `pagosPlan` + nuevo vencimiento en un solo lote. Nunca acorta un plazo vigente
//(nuevoVencimiento parte del mayor entre el vencimiento actual y hoy). Si cambia de plan, adopta sus límites.
export const registrarPagoPlan = (cliente, { plan, monto, referencia, dias, fechaPago = Date.now() }) => {
  const venceAntes = cliente.vence && cliente.vence.toMillis ? cliente.vence.toMillis() : Number(cliente.vence) || 0;
  const venceDespues = nuevoVencimiento(venceAntes, dias || PLANES[plan].dias);
  const lote = writeBatch(db);
  const asiento = {
    uidCliente: cliente.uid,
    correo: cliente.correo,
    plan,
    monto: Number(monto),
    fechaPago: aTimestamp(fechaPago),
    venceDespues: aTimestamp(venceDespues),
    creado: serverTimestamp(),
  };
  if (venceAntes) asiento.venceAntes = aTimestamp(venceAntes);
  if (referencia && referencia.trim()) asiento.referencia = referencia.trim();
  lote.set(doc(collection(db, "pagosPlan")), asiento);
  const cambios = { plan, estado: "activo", vence: aTimestamp(venceDespues), actualizado: serverTimestamp() };
  if (plan !== cliente.plan) cambios.limites = limitesDePlan(plan);
  lote.update(doc(db, "clientes", cliente.uid), cambios);
  return lote.commit();
};
