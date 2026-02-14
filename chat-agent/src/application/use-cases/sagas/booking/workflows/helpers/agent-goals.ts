/**
 * Genera las metas del agente basadas en los módulos activos
 * Excluye módulos de soporte (informational, social-protocol, conversational-signal)
 */
export function generateAgentGoals(activeModules: string[]): string {
  const coreModules = activeModules.filter(
    (mod) =>
      !["informational", "social-protocol", "conversational-signal"].includes(
        mod,
      ),
  );

  const goals: string[] = [];

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

  if (goals.length === 0) {
    goals.push("- Responder preguntas generales");
    goals.push("- Ayudar con información básica");
  }

  return goals.join("\n");
}
