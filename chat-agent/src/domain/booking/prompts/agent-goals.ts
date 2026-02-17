/**
 * Genera las metas del agente basadas en los módulos activos
 * Excluye módulos de soporte (informational, social-protocol, conversational-signal)
 */
export function generateAgentGoals(activeModules: string[]): string {
  const coreModules = activeModules.filter(
    (mod) => !["social-protocol", "conversational-signal"].includes(mod),
  );

  const goals: string[] = [];

  if (coreModules.includes("informational")) {
    goals.push("- Responder preguntas basadas únicamente en el contexto");
    goals.push(
      "- Dar información sobre el negocio: horarios, precios, servicios, ubicación etc.",
    );
  }

  if (coreModules.includes("booking")) {
    goals.push("- Gestionar reservas (crear, modificar, cancelar)");
    goals.push("- Verificar disponibilidad de horarios");
  }

  if (coreModules.includes("restaurant")) {
    goals.push("- Mostrar menú y opciones de comida");
    goals.push("- Procesar pedidos de comida");
    goals.push("- Buscar platos específicos por preferencias");
    goals.push("- Recomendar platos populares");
    goals.push("- Gestionar entregas y tiempos de espera");
  }

  if (coreModules.includes("erotic")) {
    goals.push("- Mostrar contenido para adultos");
    goals.push("- Procesar compras de contenido");
    goals.push("- Informar sobre servicios disponibles");
  }

  // fallback
  if (goals.length === 0) {
    goals.push("- Responder preguntas generales");
    goals.push("- Ayudar con información básica");
  }

  // Agregar reglas de comportamiento por policy type (siempre activas)
  goals.push("");
  goals.push("CONVERSATION BEHAVIOR:");
  goals.push(
    "- Si el usuario duda: ofrecer 2 opciones claras, NO preguntar abierto",
  );
  goals.push(
    "- Si el usuario rechaza: proponer 1 alternativa relevante, NO insistir",
  );
  goals.push(
    "- Si el usuario confirma: proceder directamente, NO volver a pedir confirmación",
  );
  goals.push("- Si el usuario está indeciso: ser empático, NO juzgar");
  goals.push("- Si no entiendes: presentar capacidades, NO decir 'no entendí'");

  return goals.join("\n");
}
