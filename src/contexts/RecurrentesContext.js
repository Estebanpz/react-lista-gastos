import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db, onSnapshot, collection, query, where } from "../firebase/firebaseConfig";
import { useAuth } from "./AuthContext";
import { estadoPago, hoyEnZona } from "../functions/recurrencias";
import { refrescarAvisos } from "../firebase/notificaciones";

const RecurrentesContext = createContext({ recurrentes: [], cargando: false, error: null, hoy: "", pendientes: 0 });

export const useRecurrentes = () => useContext(RecurrentesContext);

//Zona horaria del dispositivo: «hoy» se calcula igual que en el Worker que envía los avisos
const zonaLocal = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

//Pagos recurrentes de la persona, escuchados UNA sola vez para toda la app (Inicio y la pantalla Pagos).
//Se ordenan en memoria por próxima fecha (sin orderBy no hace falta otro índice ni falla sin conexión).
export const RecurrentesProvider = ({ children }) => {
  const { usuario } = useAuth();
  const [recurrentes, cambiarRecurrentes] = useState([]);
  const [cargando, cambiarCargando] = useState(true);
  const [error, cambiarError] = useState(null);

  useEffect(() => {
    if (!usuario) {
      cambiarRecurrentes([]);
      cambiarCargando(false);
      return undefined;
    }
    const q = query(collection(db, "recurrentes"), where("uidUsuario", "==", usuario.uid));
    return onSnapshot(
      q,
      (snap) => {
        cambiarRecurrentes(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.proximaFecha.localeCompare(b.proximaFecha) || a.descripcion.localeCompare(b.descripcion, "es"))
        );
        cambiarError(null);
        cambiarCargando(false);
      },
      (e) => {
        console.log(e);
        cambiarError(e);
        cambiarCargando(false);
      }
    );
  }, [usuario]);

  //Si este dispositivo tiene avisos activos, renueva su token cuando toca (no pide permisos)
  useEffect(() => {
    if (usuario) refrescarAvisos();
  }, [usuario]);

  const hoy = hoyEnZona(zonaLocal());

  const valor = useMemo(() => {
    //Vencidos o que vencen hoy entre los activos: alimentan la insignia del icono y el aviso en Inicio
    const pendientes = recurrentes.filter((r) => r.activo && ["vencido", "hoy"].includes(estadoPago(r, hoy))).length;
    return { recurrentes, cargando, error, hoy, pendientes };
  }, [recurrentes, cargando, error, hoy]);

  //Insignia en el icono de la app instalada (si el navegador la soporta)
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    const accion = valor.pendientes ? navigator.setAppBadge(valor.pendientes) : navigator.clearAppBadge();
    accion.catch(() => {});
  }, [valor.pendientes]);

  return <RecurrentesContext.Provider value={valor}>{children}</RecurrentesContext.Provider>;
};
