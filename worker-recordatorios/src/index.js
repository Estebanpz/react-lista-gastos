//Worker de recordatorios: solo reacciona al Cron Trigger (no expone ninguna URL).
//Los registros son JSON con conteos: nunca ids de personas, tokens, descripciones ni montos.
import { ejecutar } from "./recordatorios.js";

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      ejecutar(env)
        .then((r) => console.log(JSON.stringify({ evento: "recordatorios", cron: controller.cron, ...r })))
        .catch((e) => {
          console.error(JSON.stringify({ evento: "recordatorios-error", cron: controller.cron, mensaje: e.message }));
          throw e;
        }),
    );
  },
};
