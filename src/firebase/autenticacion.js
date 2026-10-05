import {
    auth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
} from "./firebaseConfig";

//«Recordarme» decide dónde vive la sesión:
//  activado   → en el dispositivo (IndexedDB, con localStorage de respaldo): sigue al cerrar la app
//  desactivado → solo en esta pestaña/ventana: se pierde al cerrarla
const fijarPersistencia = async (recordar) => {
    if (!recordar) {
        await setPersistence(auth, browserSessionPersistence);
        return;
    }
    try {
        await setPersistence(auth, indexedDBLocalPersistence);
    } catch (error) {
        await setPersistence(auth, browserLocalPersistence);
    }
};

export const iniciarSesion = async (correo, clave, recordar = true) => {
    await fijarPersistencia(recordar);
    return signInWithEmailAndPassword(auth, correo, clave);
};

//Con la protección contra enumeración de correos de Firebase, esta llamada responde igual
//exista o no la cuenta; la interfaz debe mostrar siempre el mismo mensaje de éxito.
export const recuperarClave = (correo) => sendPasswordResetEmail(auth, correo);
