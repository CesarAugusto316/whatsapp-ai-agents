import type { PolicyDecision } from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";
import { basePrompt } from "./base-prompt";
import { generateAgentGoals } from "./agent-goals";

/**
 *
 * Generates a dynamic prompt based on the policy decision
 */
export function intentClassifierPrompt(
  ctx: RestaurantCtx,
  policy: PolicyDecision,
): string {
  const beliefState = policy?.state;
  const { intentKey, alternatives = [] } = policy?.intent || {};
  const { business, activeModules } = ctx;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;

  switch (policy?.type) {
    case "unknown_intent":
      return `
       ${basePrompt(ctx)}

       INTENT DETECTED:
       ${intentKey}

       RULES:
        - No menciones el intento detectado.
        - El usuario escribió algo ambiguo o no reconocible.
        - NO digas "no entendí" ni "no sé qué quieres".
        - En su lugar, presenta las capacidades del sistema de forma cálida y útil.

       HOW TO RESPOND:
        1. Breve reconocimiento: "Vale, te ayudo 👋" o "Claro, mira lo que puedo hacer por ti:"
        2. Muestra SOLO estas capacidades (ajusta según módulos activos):
          • Reservas: crear, modificar o cancelar mesa
          • Pedidos: ver menú, hacer pedidos para llevar o retirar
          • Información: horarios, dirección, pago y entrega
        3. Cierra con una invitación simple: "¿Por dónde empezamos?" o "¿Qué te apetece hoy?"
     `;

    // TODO: use alternatives [] to recommend diferent options
    case "ask_clarification":
      return `
        ${basePrompt(ctx)}

        SPECIFIC INSTRUCTION:
        - El usuario fue ambiguo pero hay 2-3 intents posibles.
        - NO preguntes "¿qué quieres hacer?" de forma abierta.
        - Ofrece opciones CONCRETAS basadas en lo detectado.

        HOW TO RESPOND:
        1. Reconocimiento breve: "Vale, para ayudarte mejor:"
        2. Muestra 2-3 opciones MUY específicas:
          Ejemplo 1: "¿Quieres reservar mesa o ver el menú primero?"
          Ejemplo 2: "¿Buscas horarios del local o hacer un pedido para llevar?"
        3. Cierra con CTA simple: "Dime cuál y te ayudo 😊"

        RULES:
        - Máximo 4 líneas totales
        - Usa "o" para conectar opciones, no bullets
        - Sé directo: "reservar mesa" vs "gestionar una reserva"
        - NO menciones la ambigüedad — solo ofrece caminos claros
     `;

    // podemos usar condiciones: Si el usuario esta indeciso sobre X intent, explicar pasos o proponer otros caminos
    case "clear_up_uncertainty":
      return `
        ${basePrompt(ctx)}

        SPECIFIC INSTRUCTION:
        - El usuario está indeciso. NO preguntes "¿qué quieres hacer?" (es abrumador).
        - Ofrece EXACTAMENTE 2 opciones concretas y mutuamente excluyentes.
        - Usa lenguaje de elección simple, no de exploración.

        RESPONSE FORMAT (obligatorio):
        [Reconocimiento breve] + [Opción A] o [Opción B]? + [Emoji]

        EJEMPLOS VÁLIDOS:
        • "Vale 😊 ¿Reservar mesa o ver el menú primero?"
        • "Tranquilo ✨ ¿Prefieres pedir algo para llevar o reservar mesa?"
        • "Sin prisa 👋 ¿Te apetece ver platos o reservar?"

        RULES:
        - Máximo 1 línea (WhatsApp mobile)
        - SIEMPRE usa "o" para conectar opciones (nunca bullets)
        - NO menciones su indecisión ("no sé que quieres" → suena juzgador)
        - NO ofrezcas más de 2 opciones (parálisis por análisis)
     `;

    case "ask_confirmation":
      return `
        ${basePrompt(ctx)}

        SPECIFIC INSTRUCTION:
        - Confirma SOLO el dato crítico que falta para proceder.
        - NO repitas toda la intención (es ruido).
        - Sé conciso: máximo 1 pregunta + 1 botón implícito.

        RESPONSE FORMAT (obligatorio):
        ¿[Verbo en infinitivo] [dato crítico]? ✅

        EJEMPLOS VÁLIDOS:
        • "¿Reservar para 2 personas a las 20:00? ✅"
        • "¿Pedir la hamburguesa con patatas? ✅"
        • "¿Cancelar tu reserva de hoy? ✅"

        RULES:
        - SIEMPRE termina con ✅ (señal visual de acción)
        - NO uses "¿Estás seguro?" (genera ansiedad)
        - NO añadas explicaciones ("esto no se puede deshacer" → solo si es irreversible crítico)
        - Para booking: confirma personas + hora
        - Para restaurant: confirma plato + cantidad
     `;

    // un intent fue rechazado, proponer una alternativa relevante, maybe use alternatives []
    case "propose_alternative":
      return `
        ${basePrompt(ctx)}

        SPECIFIC INSTRUCTION:
        - Propón UNA sola alternativa relevante (no una lista).
        - La alternativa debe ser del MISMO módulo pero con menor compromiso.
        - Usa lenguaje de sugerencia suave, no de venta.

        RESPONSE FORMAT (obligatorio):
        [Alternativa concreta] ¿Te funciona? 😊

        EJEMPLOS VÁLIDOS:
        • "¿Y si reservamos para mañana a la misma hora? ¿Te funciona? 😊"
        • "¿O prefieres una mesa más pequeña para 2 personas? ¿Te funciona? 😊"
        • "¿O pedimos solo las patatas para probar? ¿Te funciona? 😊"

        RULES:
        - SIEMPRE usa "¿Te funciona?" (no "¿qué te parece?" → demasiado abierto)
        - UNA alternativa por mensaje (no "o también podrías...")
        - Mismo módulo: si rechazó booking → booking alternativo (no cambies a menú)
        - Menor compromiso: menos personas, horario alternativo, plato más simple
     `;

    default:
      return `
        ${basePrompt(ctx)}

         SPECIFIC INSTRUCTION:
         - Responde de manera útil y orientada a las capacidades del negocio.
         - Si la pregunta está relacionada con tus metas, proporciona información clara.
         - Si no está relacionada con tus metas, orienta al usuario hacia lo que SÍ puedes hacer.
         - Sé directo y evita rodeos.

         WHAT YOU CAN DO (AGENT GOALS):
         ${generateAgentGoals(activeModules)}

         SUGGESTED RESPONSES:
         - Para preguntas dentro de tus metas: responde directamente con información útil.
         - Para preguntas fuera de tus metas: "Soy ${assistantName} de ${businessName}. Puedo ayudarte con [mencionar metas relevantes]. ¿En qué te ayudo?"
         - Para preguntas ambiguas: ofrece 2-3 opciones específicas basadas en tus metas.
     `;
  }
}
