//Mensajes en español para los errores de Firebase Auth. Dicen qué pasó y qué hacer, y en el
//inicio de sesión NO revelan si el correo existe (misma frase para «no existe» y «clave mala»).
const COMUNES = {
    'auth/invalid-email': 'El correo electrónico no es válido. Revisa que esté bien escrito.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    'auth/network-request-failed': 'No hay conexión. Conéctate a internet e inténtalo de nuevo.',
};

const INICIO_SESION = {
    ...COMUNES,
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    'auth/user-not-found': 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.',
    'auth/wrong-password': 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.',
};

const REGISTRO = {
    ...COMUNES,
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
};

const RECUPERAR = { ...COMUNES };

const GENERICO = 'No se pudo completar la acción. Inténtalo de nuevo.';

export const mensajeInicioSesion = (error) => INICIO_SESION[error && error.code] || GENERICO;
export const mensajeRegistro = (error) => REGISTRO[error && error.code] || GENERICO;
export const mensajeRecuperar = (error) => RECUPERAR[error && error.code] || GENERICO;
