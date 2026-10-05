//Instalación de la PWA. El navegador dispara `beforeinstallprompt` UNA vez y puede hacerlo antes
//de que React monte, por eso este módulo se importa al arrancar (index.js) y guarda el evento.
//Safari/iOS no tiene ese evento: allí solo se pueden mostrar instrucciones manuales.

let eventoDiferido = null;
let instalada = false;
const oyentes = new Set();

const estado = () => ({ puedeInstalar: eventoDiferido !== null, instalada });
const notificar = () => oyentes.forEach((oyente) => oyente(estado()));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (evento) => {
        evento.preventDefault(); //evita el mini-aviso automático; se instala con el botón de la app
        eventoDiferido = evento;
        notificar();
    });

    window.addEventListener('appinstalled', () => {
        instalada = true;
        eventoDiferido = null;
        notificar();
    });
}

export const suscribirInstalacion = (oyente) => {
    oyentes.add(oyente);
    oyente(estado());
    return () => oyentes.delete(oyente);
};

//Abre el diálogo nativo de instalación. Devuelve "accepted", "dismissed" o "no-disponible".
export const instalar = async () => {
    if (!eventoDiferido) return 'no-disponible';
    const evento = eventoDiferido;
    eventoDiferido = null; //el evento solo sirve una vez
    evento.prompt();
    const { outcome } = await evento.userChoice;
    notificar();
    return outcome;
};

//¿La app ya se está ejecutando como app instalada?
export const estaInstalada = () =>
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

export const esIOS = () =>
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
