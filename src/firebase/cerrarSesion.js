import { auth, db, signOut, terminate, clearIndexedDbPersistence } from "./firebaseConfig";
import { desactivarAvisos } from "./notificaciones";

//Cierra la sesión y borra los datos guardados en el dispositivo, para que los gastos
//no queden en un equipo compartido. El orden importa:
//0) desactivarAvisos: borra el token de avisos de este dispositivo (necesita la sesión y Firestore abiertos)
//   y da de baja la suscripción push, para que no sigan llegando recordatorios de esta persona
//1) terminate: detiene los listeners para que no fallen al perder la sesión
//2) signOut: cierra la sesión
//3) clearIndexedDbPersistence: borra la caché local (solo es posible con Firestore terminado)
//Al final se recarga en /inicio-sesion para reiniciar Firebase limpio, incluso si algo falló.
const cerrarSesion = async () => {
  try {
    await desactivarAvisos();
  } catch (error) {
    console.log(error);
  }
  try {
    await terminate(db);
    await signOut(auth);
    await clearIndexedDbPersistence(db);
  } catch (error) {
    //Si otra pestaña tiene abierta la caché no se puede borrar; se sigue de todas formas
    console.log(error);
  } finally {
    window.location.assign("/inicio-sesion");
  }
};

export default cerrarSesion;
