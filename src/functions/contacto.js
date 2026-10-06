//Contacto para renovar o cambiar de plan. El número de WhatsApp (solo dígitos, con indicativo: 573001234567)
//va en REACT_APP_WHATSAPP_RENOVAR; sin él, WhatsApp deja elegir el contacto.
export const enlaceWhatsApp = (mensaje) => {
  const numero = (process.env.REACT_APP_WHATSAPP_RENOVAR || "").replace(/\D/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
};

export const mensajeRenovar = (correo, plan) =>
  `Hola, quiero renovar mi plan de Finanzas${plan ? ` (${plan})` : ""}. Mi correo es ${correo || "…"}.`;
