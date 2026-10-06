import { auth } from "./firebaseConfig";
import { recuperarClave } from "./autenticacion";

//Dirección del Worker de Finanzas (REACT_APP_API_CLIENTES). Sin ella, el panel solo asigna planes a cuentas creadas a mano.
export const urlApiClientes = () => (process.env.REACT_APP_API_CLIENTES || "").replace(/\/+$/, "");

const MENSAJES = {
  "correo-existe": "Ya existe una cuenta con ese correo. Para darle plan, pega su UID.",
  "correo-invalido": "Escribe un correo válido.",
  "sin-permiso": "Tu cuenta no está registrada como super admin.",
  "no-autenticado": "Tu sesión caducó. Vuelve a iniciar sesión.",
};

//Pide al Worker crear la cuenta de acceso y el plan en un solo paso. Devuelve {uid, enlace, correoEnviado}.
//`enlace` permite que la persona cree su contraseña; también se le intenta enviar por correo (Firebase).
export const crearClienteConAcceso = async ({ correo, nombre, plan, notas }) => {
  const token = await auth.currentUser.getIdToken();
  let respuesta;
  try {
    respuesta = await fetch(`${urlApiClientes()}/clientes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ correo, nombre, plan, notas }),
    });
  } catch (e) {
    throw new Error("No hay conexión con el servidor. Inténtalo de nuevo.");
  }
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(MENSAJES[cuerpo.error] || "No pudimos crear al cliente. Inténtalo de nuevo.");
  let correoEnviado = true;
  try {
    await recuperarClave(correo.trim().toLowerCase());
  } catch (e) {
    correoEnviado = false; //el enlace sigue sirviendo
  }
  return { uid: cuerpo.uid, enlace: cuerpo.enlace, correoEnviado };
};
