import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  terminate,
  clearIndexedDbPersistence,
  onSnapshot,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  deleteDoc,
  getDoc,
  getDocFromCache,
  updateDoc,
} from "firebase/firestore";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  sendPasswordResetEmail,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

//Auth solo con correo y contraseña: se inicializa sin el resolvedor de popups/redirecciones
//(código que no usamos) y con la persistencia de sesión en IndexedDB, con localStorage de respaldo
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

//Firestore con caché local persistente (IndexedDB, compartida entre pestañas):
//la app muestra los datos ya vistos sin conexión y encola las escrituras
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (error) {
  //Si el navegador no permite IndexedDB (p. ej. modo privado), se usa la caché en memoria
  console.log(error);
  db = getFirestore(app);
}

//Los emuladores SOLO se usan si el build se hizo con REACT_APP_USAR_EMULADORES=true
//y la página corre en localhost: un build de producción nunca apunta a ellos
const hostLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
if (process.env.REACT_APP_USAR_EMULADORES === "true" && hostLocal) {
  const puertoAuth = process.env.REACT_APP_EMULADOR_AUTH_PUERTO || "9099";
  const puertoFirestore = Number(process.env.REACT_APP_EMULADOR_FIRESTORE_PUERTO || 8080);
  connectAuthEmulator(auth, `http://127.0.0.1:${puertoAuth}`, { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", puertoFirestore);
}

export {
  db,
  auth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  terminate,
  clearIndexedDbPersistence,
  onSnapshot,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  deleteDoc,
  getDoc,
  getDocFromCache,
  updateDoc
};
