//Las escrituras de Firestore solo se resuelven cuando el servidor las confirma. Sin conexión
//(o con conexión inestable) la promesa tarda indefinidamente aunque el dato YA esté guardado
//en el dispositivo y se sincronizará solo al reconectar. Esta función devuelve:
//  "sincronizado" si el servidor confirmó a tiempo
//  "en-cola"      si no hubo confirmación a tiempo (el dato queda pendiente de sincronizar)
//Si Firestore rechaza la escritura (p. ej. reglas de seguridad) se propaga el error.
const TIEMPO_ESPERA_MS = 4000;

const esperarEscritura = (promesa, tiempoMs = TIEMPO_ESPERA_MS) => {
    let temporizador;
    const limite = new Promise((resolver) => {
        temporizador = setTimeout(() => resolver("en-cola"), tiempoMs);
    });

    return Promise.race([promesa.then(() => "sincronizado"), limite]).finally(() =>
        clearTimeout(temporizador)
    );
};

export default esperarEscritura;
