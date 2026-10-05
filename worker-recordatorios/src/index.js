//Worker de recordatorios: solo reacciona al Cron Trigger (no expone ninguna URL).
//Los registros llevan únicamente conteos: nunca ids de personas, tokens, descripciones ni montos.
import { ejecutar } from "./recordatorios.js";

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      ejecutar(env)
        .then((r) => console.log(`recordatorios ok: personas=${r.personas} avisos=${r.avisos} enviados=${r.enviados} tokensBorrados=${r.tokensBorrados} omitidos=${r.omitidos}`))
        .catch((e) => { console.error(`recordatorios error: ${e.message}`); throw e; }),
    );
  },
};
