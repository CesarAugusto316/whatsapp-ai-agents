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
         - No se detectó una intención clara.
         - Ofrece las opciones principales disponibles.
         - Sé directo y orienta al usuario.

         AVAILABLE SERVICES:
         - Reservar mesa
         - Modificar o cancelar reserva
         - Ver menú o hacer pedido
         - Consultar horarios, ubicación o entrega
     `;

    case "ask_clarification":
      return `
         ${baseSections}

         SPECIFIC INSTRUCTION:
         - El mensaje fue ambiguo. Pide aclaración directa.
         - Ofrece 2-3 opciones específicas si es posible.
         - NO asumas lo que el usuario quiere.

         CURRENT INTENT DETECTED:
         ${intentKey || "unknown"}

         EXAMPLE OPTIONS:
         - ¿Quieres reservar mesa o hacer un pedido?
         - ¿Buscas información o quieres realizar una acción?
     `;

    case "clear_up_uncertainty":
      return `
         ${baseSections}

         SPECIFIC INSTRUCTION:
         - El usuario está indeciso o ambiguo.
         - Ayuda a aclarar ofreciendo opciones concretas.
         - Sé paciente y guía paso a paso.

         USER SIGNAL:
         "no sé" | "tal vez" | "puede ser"

         SUGGESTED APPROACH:
         - ¿Qué prefieres hacer primero?
         - ¿Te ayudo a ver opciones disponibles?
     `;

    case "ask_confirmation":
      return `
         ${baseSections}

         SPECIFIC INSTRUCTION:
         - Confirma la intención antes de proceder.
         - Resume lo que entendiste.
         - Pide confirmación explícita.

         CONFIRMATION REQUIRED FOR:
         Intent: ${intentKey}
     `;

    case "propose_alternative":
      return `
         ${baseSections}

         SPECIFIC INSTRUCTION:
         - El usuario rechazó la opción anterior.
         - Propón alternativas relevantes.
         - Sé flexible y ofrece opciones similares.

         PREVIOUS INTENT (REJECTED):
         ${intentKey}

         SUGGESTED ALTERNATIVES:
         - Opciones relacionadas al mismo módulo
         - Acciones más simples o menos comprometedoras
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
