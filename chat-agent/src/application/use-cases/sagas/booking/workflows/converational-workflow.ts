import type { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import type { BookingResult } from "../booking-saga";
import { attachProcessReminder } from "@/application/patterns";
import { systemMessages } from "@/domain/restaurant/booking/prompts";
import { ragService } from "@/application/services/rag";
import {
  InformationalIntentKey,
  PolicyDecision,
  pomdpManager,
  shouldSkipProcessing,
  SocialProtocolIntent,
} from "@/application/services/pomdp";
import { formatSagaOutput } from "../helpers/format-saga-output";
import { IntentPayloadWithScore } from "@/application/services/pomdp/pomdp-manager";
import { Business, Day } from "@/infraestructure/adapters/cms";

/**
 *
 * @description Conversational fallback resolver.
 * Handles unstructured or out-of-FSM interactions using AI agents.
 * No authoritative business logic lives here.
 *
 * -IMPLEMENT THIS FEATURE IN THE FUTURE IS NOT URGENT NOW
 * @todo notify CMS about unhandled intents
 * Si no se detectó un intent confiable/preciso
 * @example
 * cmsAdapter.sendQuestionForReview(businessId, payload)
 */
export async function conversationalWorkflow(
  ctx: RestaurantCtx,
): Promise<BookingResult> {
  //
  let ragResults: IntentPayloadWithScore[] = [];
  const { skip, kind, msg } = shouldSkipProcessing(ctx.customerMessage);

  // skip RAG, to save resources
  if (skip && kind === "social-protocol") {
    return formatSagaOutput(msg); // saludar, despedirse, agradecer (reflejo simple)
  }
  if (skip && kind === "conversational-signal") {
    //  we know exactly the form for "conversational-signal" so we can skip RAG
    ragResults = [
      {
        score: 1,
        module: "conversational-signal",
        intentKey: msg as SocialProtocolIntent,
        requiresConfirmation: "never",
      } satisfies IntentPayloadWithScore,
    ];
  }
  if (!skip) {
    const limit = 1;
    const { points } = await ragService.searchIntent(
      ctx.customerMessage,
      ctx.activeModules, // ej: ["informational", "booking", "restaurant"],
      limit,
    );
    ragResults =
      points.map(({ payload, score }) => ({
        ...payload,
        score,
      })) ?? [];
  }

  const policyDecision = await pomdpManager.process(ctx, ragResults);

  if (policyDecision.type === "execute") {
    // call the execute function
    // await executeFunction(ctx, policyDecision);

    policyDecision.action; // intent

    await chatHistoryAdapter.push(
      ctx.chatKey,
      ctx.customerMessage,
      `
        tool_executed: ${policyDecision.intent.intentKey}
        result: ${"tool_result"}
      `,
    );
    return formatSagaOutput(
      ctx.customerMessage,
      `${policyDecision.intent?.intentKey}:${policyDecision.type}`, // optional
    );
  }

  const messages = await prepareMessages(ctx, policyDecision);
  const assistant = await aiAdapter.generateText({
    messages,
  });

  /**
   *
   * @todo Replace for a better less mecanic approach if posible
   */
  // const status = ctx.bookingState?.status;
  // const reminderMSG = status
  //   ? attachProcessReminder(assistant, status, messages)
  //   : assistant;
  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, assistant);
  return formatSagaOutput(
    ctx.customerMessage,
    `${policyDecision.intent?.intentKey}:${policyDecision.type}`, // optional
    messages, // optional
  );
}

/**
 *
 * @param ctx
 * @param policy
 * @returns
 */
export async function prepareMessages(
  ctx: RestaurantCtx,
  policy?: PolicyDecision,
): Promise<ChatMessage[]> {
  //
  const chatHistoryCache = await chatHistoryAdapter.get(ctx.chatKey);
  const isFirstMessage = chatHistoryCache.length === 0;

  const systemPrompt = generateDynamicPrompt(ctx, policy);

  if (isFirstMessage) {
    return [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: systemMessages.initialGreeting(
          ctx.customerMessage,
          ctx.customer?.name,
        ),
      },
    ];
  }

  return [
    { role: "system", content: systemPrompt },
    ...chatHistoryCache,
    { role: "user", content: ctx.customerMessage },
  ];
}

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
function generateDynamicPrompt(
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
 * Template engine para respuestas info sin LLM
 * Variación controlada mediante rotación cíclica + sinónimos
 * Basado en: hash simple del timestamp + businessId para aleatoriedad determinista
 */
export function generateInfoResponse(
  intentKey: InformationalIntentKey,
  business: Business,
): string {
  // Fórmula matemática para aleatoriedad determinista (sin Math.random)
  // Basada en: últimos 3 dígitos del timestamp actual + businessId length
  const seed = (Date.now() % 1000) + business.id.length;
  const randIndex = (n: number) => seed % n;

  // Helper para formatear horas (open/close en formato 24h → "09:00-14:00")
  const formatHours = (slots: Day[] | null | undefined): string => {
    if (!slots || slots.length === 0) return "cerrado hoy";
    return slots
      .map(
        (slot) =>
          `${String(slot.open).padStart(2, "0")}:00-${String(slot.close).padStart(2, "0")}:00`,
      )
      .join(" y ");
  };

  // Helper para sinónimos controlados (evita alucinaciones)
  const synonyms = {
    location: ["en", "ubicados en", "situados en", "encontrarnos en"],
    hours: ["abrimos", "atendemos", "estamos abiertos"],
    contact: ["contactar", "llamar", "escribirnos"],
    payment: ["aceptamos", "recibimos", "permitimos"],
  };

  switch (intentKey) {
    case "info:ask_location": {
      const addr =
        business.general.address?.trim() || "dirección no disponible";
      const templates = [
        `Estamos ${synonyms.location[randIndex(4)]} ${addr}`,
        `📍 ${addr}`,
        `Nuestra ubicación: ${addr}`,
        `Puedes encontrarnos ${synonyms.location[randIndex(4)]} ${addr}`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_business_hours": {
      // Obtener día actual en timezone del negocio (sin librerías externas)
      const now = new Date();
      const tzDate = new Date(
        now.toLocaleString("en-US", { timeZone: business.general.timezone }),
      );
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const today = dayNames[tzDate.getDay()] as keyof typeof business.schedule;

      const hours = formatHours(business.schedule[today]);
      const templates = [
        `Hoy ${synonyms.hours[randIndex(3)]} de ${hours}`,
        `⏰ Horario de hoy: ${hours}`,
        `${hours} es nuestro horario hoy`,
        `Estamos ${hours} hoy`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_payment_methods": {
      // Inferir métodos por país (sin campo explícito en schema)
      const country = business.general.country;
      const methods =
        country === "ES"
          ? "efectivo, tarjeta y Bizum"
          : ["COL", "EC", "PE"].includes(country || "")
            ? "efectivo, tarjeta, Nequi y Daviplata"
            : "efectivo y tarjeta";

      const templates = [
        `${synonyms.payment[randIndex(3)]} ${methods}`,
        `Formas de pago: ${methods}`,
        `💳 ${methods}`,
        `Puedes pagar con ${methods}`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_contact": {
      const phone =
        business.general.phoneNumber?.trim() || "teléfono no disponible";
      const templates = [
        `Puedes ${synonyms.contact[randIndex(3)]} al ${phone}`,
        `📞 ${phone}`,
        `Nuestro contacto: ${phone}`,
        `Escríbenos al ${phone}`,
      ];
      return templates[randIndex(4)];
    }

    case "info:ask_price": {
      // Nota crítica: Esta intención NO genera respuesta final aquí
      // El policy engine debe llamar a API de productos/reservas y luego:
      //   1. Obtener precio real
      //   2. Formatear con currency/taxes
      //   3. Usar template minimalista tipo: `El precio es ${amount} ${currency}`
      // Este placeholder evita alucinaciones del LLM mientras se espera API
      return "Déjame consultar los precios actuales para ti...";
    }
  }
}
