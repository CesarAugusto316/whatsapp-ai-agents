import { PolicyDecision } from "@/application/services/pomdp";
import { RestaurantCtx } from "@/domain/restaurant";
import { formatSchedule, getGoogleMapLink } from "@/domain/utilities";
import { Business } from "@/infraestructure/adapters/cms";
import { attachProcessReminder } from "@/application/patterns";

export const WRITING_STYLE = `
  - Clear, concise and friendly
  - Use emojis when appropriate 😊✨✅
  - Polite
  - The message should feel like it comes from a real person helping the user, not from a system.
  - Keep it short when possible

  Language rules:
  - ALWAYS respond in SPANISH
`;

/**
 * Genera las metas del agente basadas en los módulos activos
 * Excluye módulos de soporte (informational, social-protocol, conversational-signal)
 */
function generateAgentGoals(activeModules: string[]): string {
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

/**
 * Generates a dynamic prompt based on the policy decision
 */
export function generateIntentPrompt(
  ctx: RestaurantCtx,
  policy?: PolicyDecision,
): string {
  const { intentKey } = policy?.intent || {};
  const { business, activeModules } = ctx;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;
  const agentGoals = generateAgentGoals(activeModules);

  const baseSections = `
     You are ${assistantName}, an assistant for ${businessName}.

     AGENT GOALS:
     ${agentGoals}

     WRITING STYLE:
     ${WRITING_STYLE}
  `;

  switch (policy?.type) {
    case "unknown_intent":
      return `
        ${baseSections}

        SPECIFIC INSTRUCTION:
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

        RULES:
        - Usa máximo 6 líneas (mobile-friendly)
        - Emojis como bullets (🍽️ 📋 📍), nunca guiones técnicos
        - Lenguaje coloquial: "reservar mesa" NO "gestionar reservas"
        - NO menciones que el mensaje fue ambiguo — solo orienta positivamente
     `;

    case "ask_clarification":
      return `
        ${baseSections}

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

    case "clear_up_uncertainty":
      return `
        ${baseSections}

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
        ${baseSections}

        SPECIFIC INSTRUCTION:
        - Confirma SOLO el dato crítico que falta para proceder.
        - NO repitas toda la intención (es ruido).
        - Sé ultra-conciso: máximo 1 pregunta + 1 botón implícito.

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

    case "propose_alternative":
      return `
        ${baseSections}

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
         ${baseSections}

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

/**
 *
 * @todo DELETE
 */
export function businesInfoPrompt(business: Business) {
  const { name, general, schedule, assistantName } = business;
  const SCHEDULE_BLOCK = formatSchedule(schedule, general.timezone);
  const currentDate = new Date().toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "full",
    timeZone: general.timezone,
  });

  const businessName = `${business.general.businessType} ${business.name}`;

  const baseSections = `
     You are ${assistantName}, an assistant for ${businessName}.

     RULES:
     - Your role is strictly informational, a user asks a question and you provide a useful response based on existing information.
     - You ONLY provide existing information
     - You NEVER request, ask for, or prompt user to provide any information
     - You NEVER ask questions that require user input (names, dates, times, etc.)

     WRITING STYLE:
     ${WRITING_STYLE}
  `;

  const basicInfo = `
    ${baseSections}

    ==============================
    BUSINESS GENERAL INFORMATION
    ==============================
    - Name: ${name}
    - Business type: ${general.businessType}
    - General Description: ${general.description}
    - Timezone: ${general.timezone}

    - Booking:
      - Approval by owner/admin required: ${general.requireAppointmentApproval ? "Yes" : "No"}
      - Minimal booking duration: ${schedule.averageTime} minutes

    - Address: ${general.address}
    - Location Google Map Link: ${general.location ? getGoogleMapLink(general.location[0], general.location[1]) : ""}

    - Price: Depends on the selected product or item
    - Payment Methods:
       - Cash ${business.currency}
       - Debit Card
       - Credit Card

    - Estimated Delivery Processing Time: Depends on the selected product or item and the demand
    - Delivery Methods:
       - Para llevar: El Cliente puede pedir a domicilio
       - Para retirar: El Cliente puede ir retirar al establecimiento
       - El cliente elige el metodo al hacer una order o pedido

    - Contact Info:
      - Owner Email: ${general?.user?.email}
      - Owner Phone number: ${general?.user?.phoneNumber}

    ==============================
     BUSINESS SCHEDULE (working hours)
    ==============================
      ${SCHEDULE_BLOCK}

    ==============================
      TEMPORAL CONTEXT
    ==============================
      - Current date/time (for reference only): ${currentDate}
      - Do NOT infer availability, predict, or invent future schedules.
  `;
  return basicInfo;
}
