import { useEffect, useState } from "react";
import { db, onSnapshot, collection } from "../firebase/firebaseConfig";
import { query, where } from "firebase/firestore";
import { claveUso } from "../functions/planes";

//Para el panel del super admin: todos los clientes y, de la colección `uso` (que ya se escucha entera), el total del mes,
//los pagos de gastos fijos del mes y el historial de todos los meses de cada cliente. Las reglas solo dejan leer esto al admin.
export const useClientesAdmin = (activo) => {
  const [clientes, cambiarClientes] = useState(null);
  const [usos, cambiarUsos] = useState({});
  const [fijos, cambiarFijos] = useState({});
  const [historial, cambiarHistorial] = useState({});
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
        const mapaFijos = {};
        const meses = {};
        s.docs.forEach((d) => {
          const { uidUsuario, gastos = 0, fijos: deFijos = 0 } = d.data();
          const partes = d.id.split("_");
          const anio = Number(partes[partes.length - 2]);
          const mes = Number(partes[partes.length - 1]);
          if (!uidUsuario || !Number.isInteger(anio) || !Number.isInteger(mes)) return;
          if (d.id === claveUso(uidUsuario)) {
            mapa[uidUsuario] = gastos;
            mapaFijos[uidUsuario] = deFijos;
          }
          if (!meses[uidUsuario]) meses[uidUsuario] = [];
          meses[uidUsuario].push({ anio, mes, gastos, fijos: deFijos });
        });
        Object.values(meses).forEach((lista) => lista.sort((a, b) => b.anio - a.anio || b.mes - a.mes));
        cambiarUsos(mapa);
        cambiarFijos(mapaFijos);
        cambiarHistorial(meses);
      },
      alFallar
    );
    return () => {
      quitarClientes();
      quitarUso();
    };
  }, [activo]);

  return { clientes, usos, fijos, historial, error };
};

//Pagos de un cliente, todos (más recientes primero); la ficha los pagina. Se ordena aquí para no exigir un índice compuesto.
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
