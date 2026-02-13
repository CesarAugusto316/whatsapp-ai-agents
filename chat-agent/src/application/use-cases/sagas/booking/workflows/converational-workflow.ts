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
      ctx.activeModules, // ["informational", "booking", "restaurant"],
      limit,
    );
    ragResults =
      points.map(({ payload, score }) => ({
        ...payload,
        score,
      })) ?? [];
  }

  const policyDecision = await pomdpManager.process(ctx, ragResults);
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
    `${policyDecision.intent?.intent}:${policyDecision.type}`,
    messages,
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
    : defaultPrompt({
        business: ctx.business,
        flowStatus: ctx.bookingState?.status,
        intent: undefined,
        retrievedChunks: [],
      });

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

/**
 * Generates a dynamic prompt based on the policy decision
 */
function generateDynamicPrompt(
  ctx: RestaurantCtx,
  policy: PolicyDecision,
): string {
  const { intent, module, signals } = policy.intent || {};
  const { business, customerMessage, bookingState } = ctx;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;

  const baseSections = `
    You are ${assistantName}, an assistant for ${businessName}.

    USER MESSAGE:
    "${customerMessage}"

    WRITING STYLE:
    - Always respond in SPANISH
    - Be concise, friendly, and helpful
    - Use emojis when appropriate
  `;

  switch (policy.type) {
    case "ask_clarification":
      return `
        ${baseSections}

        SPECIFIC INSTRUCTION:
        - The message was ambiguous. Ask a direct question to clarify intent.
        - Offer 2-3 specific options if possible.
        - Do NOT assume what the user wants.

        CURRENT INTENT DETECTED:
        ${intent || "unknown"}

        AVAILABLE OPTIONS:
        - Make a reservation
        - Modify or cancel reservation
        - View menu or place order
        - Ask about delivery or business info
     `;

    case "ask_confirmation":
      return `
        ${baseSections}

        SPECIFIC INSTRUCTION:
        - Confirm the user's intent before proceeding.
        - Summarize what you understood.
        - Ask for explicit confirmation.

        CONFIRMATION REQUIRED FOR:
        Intent: ${intent}
    `;

    case "execute":
      return `
        ${baseSections}

        SPECIFIC INSTRUCTION:
        - Acknowledge the request and explain next steps.
        - The system will run workflow: "${policy.action}".

        EXECUTION DETAILS:
        Intent: ${intent}
        Saga: ${policy.action}
   `;

    default:
      return defaultPrompt({
        business: ctx.business,
        flowStatus: bookingState?.status,
        intent: intent,
        retrievedChunks: [],
      });
  }
}
