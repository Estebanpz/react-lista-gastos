import { useEffect, useState } from "react";
import { db, onSnapshot, collection } from "../firebase/firebaseConfig";
import { query, where } from "firebase/firestore";
import { claveUso } from "../functions/planes";

//Para el panel del super admin: todos los clientes, el uso de gastos del mes de cada uno y, si se pide, los pagos
//de uno. Las reglas solo dejan leer esto al administrador.
export const useClientesAdmin = (activo) => {
  const [clientes, cambiarClientes] = useState(null);
  const [usos, cambiarUsos] = useState({});
  const [error, cambiarError] = useState(false);

  useEffect(() => {
    if (!activo) return undefined;
    const alFallar = (e) => {
      console.log(e);
      cambiarError(true);
    };
    const quitarClientes = onSnapshot(
      collection(db, "clientes"),
      (s) => {
        cambiarError(false);
        cambiarClientes(s.docs.map((d) => ({ uid: d.id, ...d.data() })));
      },
      alFallar
    );
    const quitarUso = onSnapshot(
      collection(db, "uso"),
      (s) => {
        const mapa = {};
        s.docs.forEach((d) => {
          const { uidUsuario, gastos } = d.data();
          if (d.id === claveUso(uidUsuario)) mapa[uidUsuario] = gastos || 0;
        });
        cambiarUsos(mapa);
      },
      alFallar
    );
    return () => {
      quitarClientes();
      quitarUso();
    };
  }, [activo]);

  return { clientes, usos, error };
};

//Pagos de un cliente (más recientes primero). Se ordena aquí para no exigir un índice compuesto.
export const usePagosCliente = (uid) => {
  const [pagos, cambiarPagos] = useState(null);
  useEffect(() => {
    cambiarPagos(null);
    if (!uid) return undefined;
    return onSnapshot(
      query(collection(db, "pagosPlan"), where("uidCliente", "==", uid)),
      (s) => cambiarPagos(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.fechaPago.toMillis() - a.fechaPago.toMillis())),
      (e) => {
        console.log(e);
        cambiarPagos([]);
      }
    );
  }, [uid]);
  return pagos;
};
