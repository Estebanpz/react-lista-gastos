import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db, onSnapshot, doc, getDoc } from "../firebase/firebaseConfig";
import { useAuth } from "./AuthContext";
import { claveUso, estadoCliente, puedeEscribir, limitesDePlan } from "../functions/planes";

//Valor por defecto (fuera del proveedor, p. ej. en pruebas): todo permitido, sin límites
const VALOR_LIBRE = { cargando: false, cliente: null, estado: "activo", puedeEscribir: true, limites: limitesDePlan("negocio"), usoGastos: 0, esAdmin: false };
const ClienteContext = createContext(VALOR_LIBRE);

export const useCliente = () => useContext(ClienteContext);

//Plan de la persona (clientes/{uid}, lo escribe el super admin), uso del mes (uso/{uid}_{año}_{mes}) y si es
//super admin (super_admins/{uid}). Una sola escucha para toda la app. Sin documento de plan no se puede registrar nada:
//las reglas de Firestore lo hacen cumplir; aquí solo se muestra el aviso y se desactivan los botones.
export const ClienteProvider = ({ children }) => {
  const { usuario } = useAuth();
  const [cliente, cambiarCliente] = useState(null);
  const [usoGastos, cambiarUsoGastos] = useState(0);
  const [esAdmin, cambiarEsAdmin] = useState(false);
  const [cargando, cambiarCargando] = useState(true);
  const [cargandoAdmin, cambiarCargandoAdmin] = useState(true); //¿ya se sabe si es super admin?
  const [ahora, cambiarAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!usuario) {
      cambiarCliente(null);
      cambiarUsoGastos(0);
      cambiarEsAdmin(false);
      cambiarCargando(false);
      cambiarCargandoAdmin(false);
      return undefined;
    }
    cambiarCargando(true);
    cambiarCargandoAdmin(true);
    const alFallar = (e) => {
      console.log(e);
      cambiarCargando(false);
    };
    const quitarPlan = onSnapshot(
      doc(db, "clientes", usuario.uid),
      (d) => {
        cambiarCliente(d.exists() ? d.data() : null);
        cambiarCargando(false);
      },
      alFallar
    );
    const quitarUso = onSnapshot(
      doc(db, "uso", claveUso(usuario.uid)),
      (d) => cambiarUsoGastos(d.exists() ? d.data().gastos || 0 : 0),
      (e) => console.log(e)
    );
    //Solo se lee una vez; si no existe o no hay permiso, no es administrador
    getDoc(doc(db, "super_admins", usuario.uid))
      .then((d) => cambiarEsAdmin(d.exists()))
      .catch(() => cambiarEsAdmin(false))
      .then(() => cambiarCargandoAdmin(false));
    return () => {
      quitarPlan();
      quitarUso();
    };
  }, [usuario]);

  //El vencimiento llega con la app abierta: se vuelve a evaluar cada minuto y al volver a la pestaña
  useEffect(() => {
    const actualizar = () => cambiarAhora(Date.now());
    const reloj = window.setInterval(actualizar, 60000);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      window.clearInterval(reloj);
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, []);

  const valor = useMemo(() => {
    const estado = estadoCliente(cliente, ahora);
    return {
      //Mientras no se sepa si es super admin tampoco se decide nada (evita redirigirlo a Inicio al recargar /admin)
      cargando: cargando || cargandoAdmin,
      cliente,
      estado,
      //Mientras carga no se bloquea nada (evita un parpadeo de «solo lectura» al abrir)
      puedeEscribir: cargando || cargandoAdmin ? true : puedeEscribir(cliente, ahora),
      limites: cliente ? cliente.limites : limitesDePlan("prueba"),
      usoGastos,
      esAdmin,
    };
  }, [cliente, cargando, cargandoAdmin, usoGastos, esAdmin, ahora]);

  return <ClienteContext.Provider value={valor}>{children}</ClienteContext.Provider>;
};
