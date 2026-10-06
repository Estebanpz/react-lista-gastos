//Worker de Finanzas. Dos entradas:
//  - scheduled: el cron diario de avisos (pagos recurrentes y planes de clientes).
//  - fetch: API del panel de super admin (crear clientes). Exige ID token de un super admin.
//Los registros son JSON con conteos: nunca ids de personas, correos, tokens, descripciones ni montos.
import { ejecutar } from "./recordatorios.js";
import { manejarSolicitud } from "./api.js";

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

  async fetch(request, env) {
    try {
      return await manejarSolicitud(request, env);
    } catch (e) {
      console.error(JSON.stringify({ evento: "api-error", mensaje: e.message }));
      return new Response(JSON.stringify({ error: "error-interno" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  },
};
