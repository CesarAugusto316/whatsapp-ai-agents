import { CONVERSATION_BEHAVIOR } from "./global-rules";

/**
 * Genera las metas del agente basadas en los módulos activos
 * Excluye módulos de soporte (social-protocol, conversational-signal)
 *
 * NOTA: CONVERSATION_BEHAVIOR ahora está en global-rules.ts para evitar duplicación
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

  // NOTA: CONVERSATION_BEHAVIOR se inyecta desde global-rules.ts
  // No lo agregamos aquí para evitar duplicación
  return goals.join("\n");
}

/**
 * Exporta CONVERSATION_BEHAVIOR para que pueda usarse directamente
 * @link global-rules.ts
 */
export { CONVERSATION_BEHAVIOR } from "./global-rules";
