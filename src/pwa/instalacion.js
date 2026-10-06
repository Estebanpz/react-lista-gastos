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

//Qué navegador de iPhone/iPad es y de qué versión de iOS. En iOS TODOS los navegadores usan el motor de Safari, pero
//solo Safari (y, desde iOS 16.4, los que Apple autoriza: Chrome, Firefox, Edge…) pueden «Agregar a pantalla de inicio».
//Devuelve {navegador: "safari"|"chrome"|"firefox"|"edge"|"integrado"|"otro", version: número|null}.
//`integrado` = navegador interno de otra app (Instagram, Facebook…): ahí no se puede instalar.
export const detectarNavegadorIOS = (ua = window.navigator.userAgent) => {
    const m = /OS (\d+)[_.](\d+)/.exec(ua);
    const version = m ? Number(m[1]) + Number(m[2]) / 100 : null; //17.04 = iOS 17.4 (solo para comparar con 16.04)
    let navegador = 'otro';
    if (/FBAN|FBAV|Instagram|MicroMessenger|Line\//i.test(ua)) navegador = 'integrado';
    else if (/CriOS/.test(ua)) navegador = 'chrome';
    else if (/FxiOS/.test(ua)) navegador = 'firefox';
    else if (/EdgiOS/.test(ua)) navegador = 'edge';
    else if (/OPiOS|OPT\//.test(ua)) navegador = 'otro';
    else if (/Safari\//.test(ua)) navegador = 'safari';
    else navegador = 'integrado'; //sin «Safari/» en el user agent suele ser un WebView de otra app
    return { navegador, version };
};

//¿Se puede instalar desde este navegador de iPhone? Safari siempre; los demás desde iOS 16.4.
export const puedeInstalarEnEsteIOS = (info = detectarNavegadorIOS()) => {
    if (info.navegador === 'safari') return true;
    if (['chrome', 'firefox', 'edge'].includes(info.navegador)) return info.version === null || info.version >= 16.04;
    return false;
};
