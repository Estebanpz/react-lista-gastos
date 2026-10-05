//Registro del service worker y detección de versiones nuevas.
//La actualización NUNCA se aplica sola: se avisa a la interfaz (AvisoActualizacion) y solo
//cuando la persona pulsa «Actualizar» se activa la versión nueva y se recarga la página.

const UNA_HORA_MS = 60 * 60 * 1000;

let registroActual = null;
let hayActualizacion = false;
const oyentes = new Set();

const notificar = (valor) => {
    hayActualizacion = valor;
    oyentes.forEach((oyente) => oyente(valor));
};

//Para que la interfaz sepa si hay una versión nueva esperando (devuelve la función para dejar de escuchar)
export const suscribirActualizacion = (oyente) => {
    oyentes.add(oyente);
    oyente(hayActualizacion);
    return () => oyentes.delete(oyente);
};

//Activa la versión que está en espera; la página se recarga cuando toma el control
export const aplicarActualizacion = () => {
    const enEspera = registroActual && registroActual.waiting;
    if (enEspera) {
        enEspera.postMessage({ type: 'SKIP_WAITING' });
    }
};

//Lógica de observación, separada para poder probarla con un registro simulado.
//`habiaControlador` indica si la página ya estaba controlada por un service worker antes de
//registrar: solo entonces un SW «installed» es una ACTUALIZACIÓN (y no la primera instalación).
export const observarRegistro = (registro, habiaControlador) => {
    registroActual = registro;

    if (registro.waiting && habiaControlador) {
        notificar(true);
    }

    registro.addEventListener('updatefound', () => {
        const nuevo = registro.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
            if (nuevo.state === 'installed' && habiaControlador) {
                notificar(true);
            }
        });
    });
};

export const registrarServiceWorker = () => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
        return;
    }

    //Se captura ANTES de registrar: en la primera visita no hay controlador y no debe recargarse
    const habiaControlador = Boolean(navigator.serviceWorker.controller);

    window.addEventListener('load', async () => {
        try {
            const registro = await navigator.serviceWorker.register(
                `${process.env.PUBLIC_URL}/service-worker.js`
            );
            observarRegistro(registro, habiaControlador);

            //Al volver a la app se busca una versión nueva, como máximo una vez por hora
            let ultimaComprobacion = Date.now();
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && Date.now() - ultimaComprobacion > UNA_HORA_MS) {
                    ultimaComprobacion = Date.now();
                    registro.update().catch((error) => console.log(error));
                }
            });
        } catch (error) {
            console.log('No se pudo registrar el service worker', error);
        }
    });

    //Cuando la versión nueva toma el control se recarga UNA sola vez (si había una anterior)
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!habiaControlador || recargando) return;
        recargando = true;
        window.location.reload();
    });
};
