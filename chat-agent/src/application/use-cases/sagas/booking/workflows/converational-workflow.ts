import type { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import type { BookingResult } from "../booking-saga";
import { attachProcessReminder } from "@/application/patterns";
import {
  defaultPrompt,
  systemMessages,
} from "@/domain/restaurant/booking/prompts";
import { ragService } from "@/application/services/rag";
import {
  PolicyDecision,
  pomdpManager,
  shouldSkipProcessing,
  SocialProtocolIntent,
} from "@/application/services/pomdp";
import { formatSagaOutput } from "../helpers/format-saga-output";
import { IntentPayloadWithScore } from "@/application/services/pomdp/pomdp-manager";

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
        intent: msg as SocialProtocolIntent,
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

    policyDecision.action;

    await chatHistoryAdapter.push(
      ctx.chatKey,
      ctx.customerMessage,
      `
        tool_executed: ${policyDecision.intent.intent}
        result: ${"tool_result"}
      `,
    );
    return formatSagaOutput(
      ctx.customerMessage,
      `${policyDecision.intent?.intent}:${policyDecision.type}`, // optional
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
    `${policyDecision.intent?.intent}:${policyDecision.type}`, // optional
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

  const systemPrompt = policy
    ? generateDynamicPrompt(ctx, policy)
    : defaultPrompt(ctx);

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
  policy: PolicyDecision,
): string {
  const { intent } = policy.intent || {};
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

  switch (policy.type) {
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
         ${intent || "unknown"}

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
         Intent: ${intent}
     `;

    case "propose_alternative":
      return `
         ${baseSections}

         SPECIFIC INSTRUCTION:
         - El usuario rechazó la opción anterior.
         - Propón alternativas relevantes.
         - Sé flexible y ofrece opciones similares.

         PREVIOUS INTENT (REJECTED):
         ${intent}

         SUGGESTED ALTERNATIVES:
         - Opciones relacionadas al mismo módulo
         - Acciones más simples o menos comprometedoras
     `;

    default:
      return `
        ${baseSections}

        SPECIFIC INSTRUCTION:
        - El usuario necesita ayuda específica.
        - Proporciona instrucciones claras y concisas.
        - Ofrece opciones relevantes y flexibles.
        - Asegúrate de entender la pregunta antes de responder.
        - Evita respuestas ambiguas o vagas.

        SUGGESTED APPROACH:
        - ¿Qué prefieres hacer primero?
        - ¿Te ayudo a ver opciones disponibles?
    `;
  }
}
