import type { RestaurantCtx } from "@/domain/restaurant";
import { chatHistoryAdapter } from "@/infraestructure/adapters/cache";
import { aiAdapter, ChatMessage } from "@/infraestructure/adapters/ai";
import type { BookingResult } from "../booking-saga";
import { attachProcessReminder } from "@/application/patterns";
import {
  conversationalPrompt,
  systemMessages,
} from "@/domain/restaurant/booking/prompts";
import { ragService } from "@/application/services/rag";
import {
  BeliefIntent,
  PomdpManager,
  shouldSkipProcessing,
} from "@/application/services/pomdp";
import { logger } from "@/infraestructure/logging";
import { formatSagaOutput } from "../helpers/format-saga-output";
import { PomdpResult } from "@/application/services/pomdp/pomdp-manager";
import { Product } from "@/infraestructure/adapters/cms";

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
  const { skip, kind, msg } = shouldSkipProcessing(ctx.customerMessage);

  // skip RAG, to save resources
  if (skip && kind === "social-protocol") {
    return formatSagaOutput(msg); // saludar, despedirse, agradecer (reflejo simple)
  }

  const { points: matchedIntents } = await ragService.searchIntent(
    ctx.customerMessage,
    ctx.activeModules, // ["informational", "booking", "restaurant"],
  );

  logger.info("intentPoints", matchedIntents);

  const pompdResult = await new PomdpManager().process(
    ctx,
    matchedIntents.map(({ payload, score }) => ({
      ...payload,
      score,
    })),
  );

  const messages = await prepareMessages(ctx, pompdResult);
  const assistant = await aiAdapter.generateText({
    messages,
  });

  /**
   *
   * @todo Replace for a better less mecanic approach if posible
   */
  const status = ctx.bookingState?.status;
  const reminderMSG = status
    ? attachProcessReminder(assistant, status, messages)
    : assistant;

  await chatHistoryAdapter.push(ctx.chatKey, ctx.customerMessage, assistant);
  return formatSagaOutput(reminderMSG);
}

/**
 *
 * @param ctx
 * @param pompdResult
 * @returns
 */
export async function prepareMessages(
  ctx: RestaurantCtx,
  pompdResult?: PomdpResult,
) {
  let messages: ChatMessage[] = [];
  const chatHistoryCache = await chatHistoryAdapter.get(ctx.chatKey);
  const isFirstMessage = chatHistoryCache.length === 0;

  // Determine the system prompt based on policy decision if available
  let systemPrompt: string;

  if (pompdResult && pompdResult.policyDecision) {
    systemPrompt = generateDynamicPrompt(ctx, pompdResult, []);
  } else {
    // Use standard conversational prompt
    systemPrompt = conversationalPrompt({
      business: ctx.business,
      flowStatus: ctx.bookingState?.status,
      intent: undefined,
      retrievedChunks: [],
    });
  }

  if (isFirstMessage) {
    messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: systemMessages.initialGreeting(
          ctx.customerMessage,
          ctx.customer?.name,
        ),
      },
    ] satisfies ChatMessage[];
  } //
  else {
    messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
      {
        role: "user",
        content: ctx.customerMessage,
      },
    ] satisfies ChatMessage[];
  }

  return messages;
}

/**
 * Generates a dynamic prompt based on the policy decision
 */
function generateDynamicPrompt(
  ctx: RestaurantCtx,
  pompdResult: PomdpResult,
  products?: Product[],
): string {
  const {
    beliefState,
    confidenceMetrics,
    policyDecision,
    recommendedIntent,
    topIntents,
  } = pompdResult;
  const { business, bookingState, customerMessage } = ctx;
  const flowStatus = bookingState?.status;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;

  // Format top intents for context
  const topIntentsInfo =
    topIntents
      ?.slice(0, 3)
      .map((t) => `${t.intent}: ${Math.round(t.probability * 100)}%`)
      .join("\n") || "None detected";

  // Format products for context if provided
  const productsContext =
    products && products.length > 0
      ? products
          .map((p) => `- ${p.name}: ${p.description} - $${p.price}`)
          .join("\n")
      : "";

  switch (policyDecision.type) {
    case "ask_clarification":
      return `
        You are ${assistantName}, an assistant for ${businessName}.

        ==============================
        SPECIFIC INSTRUCTION FOR CLARIFICATION
        ==============================
        - The user's message "${customerMessage}" was ambiguous or unclear
        - You need to ask for clarification to determine their exact intent
        - Ask a specific, direct question to clarify their intention
        - Do NOT make assumptions about what they want
        - Keep your question short and to the point
        - If possible, offer 2-3 specific options to choose from

        ==============================
        CURRENT INTENT DETECTED
        ==============================
        Detected intent: ${recommendedIntent || "unknown"}
        Confidence: ${confidenceMetrics?.confidence ? Math.round(confidenceMetrics.confidence * 100) + "%" : "unknown"}
        Uncertainty (entropy): ${confidenceMetrics?.entropy ? Math.round(confidenceMetrics.entropy * 100) + "%" : "unknown"}

        ==============================
        TOP INTENTS DETECTED
        ==============================
        ${topIntentsInfo}

        ==============================
        AVAILABLE OPTIONS
        ==============================
        - Make a reservation
        - Modify an existing reservation
        - Cancel a reservation
        - View menu
        - Place an order
        - Ask about delivery
        - Other inquiry

        ==============================
        WRITING STYLE
        ==============================
        - Friendly and helpful
        - Use emojis when appropriate 😊
        - Always respond in SPANISH
        - Be concise but clear
      `;

    case "ask_confirmation":
      return `
        You are ${assistantName}, an assistant for ${businessName}.

        ==============================
        SPECIFIC INSTRUCTION FOR CONFIRMATION
        ==============================
        - The user expressed intent to "${recommendedIntent}"
        - You need to confirm their intention before proceeding
        - Summarize what you understood they want to do
        - Ask for explicit confirmation before taking action
        - Be clear about what will happen next if confirmed

        ==============================
        USER MESSAGE
        ==============================
        ${customerMessage}

        ==============================
        CONFIRMATION REQUIRED FOR
        ==============================
        Intent: ${recommendedIntent}
        Confidence: ${confidenceMetrics?.confidence ? Math.round(confidenceMetrics.confidence * 100) + "%" : "unknown"}

        ==============================
        AVAILABLE PRODUCTS (if applicable)
        ==============================
        ${productsContext || "No products available for selection"}

        ==============================
        WRITING STYLE
        ==============================
        - Professional and clear
        - Use emojis when appropriate ✅
        - Always respond in SPANISH
        - Be concise but thorough
      `;

    // BYPASS LLM EXECUTION IF POSSIBLE, POLICY ENGINE DECIDES
    case "execute":
      return `
        You are ${assistantName}, an assistant for ${businessName}.

        ==============================
        SPECIFIC INSTRUCTION FOR EXECUTION
        ==============================
        - The user wants to execute action for intent "${recommendedIntent?.intent}"
        - The system will execute the "${policyDecision.saga}" workflow
        - Acknowledge their request and explain what will happen next
        - Provide any necessary information about the process
        - Set expectations about timing or next steps

        ==============================
        USER REQUEST
        ==============================
        ${customerMessage}

        ==============================
        EXECUTION DETAILS
        ==============================
        Intent: ${recommendedIntent}
        Saga: ${policyDecision.saga}
        Confidence: ${confidenceMetrics?.confidence ? Math.round(confidenceMetrics.confidence * 100) + "%" : "unknown"}

        ==============================
        AVAILABLE PRODUCTS (if applicable)
        ==============================
        ${productsContext || "No products available for selection"}

        ==============================
        WRITING STYLE
        ==============================
        - Confident and reassuring
        - Use emojis when appropriate 🔄
        - Always respond in SPANISH
        - Be clear about next steps
      `;

    case "fallback":
      return `
        You are ${assistantName}, an assistant for ${businessName}.

        ==============================
        SPECIFIC INSTRUCTION FOR FALLBACK
        ==============================
        - The system is in a fallback state due to: ${policyDecision.dominant?.intent || "unknown reason"}
        - The user's message "${customerMessage}" could not be processed automatically
        - Provide a helpful response that acknowledges the situation
        - Guide the user toward available options
        - Be empathetic and offer assistance

        ==============================
        SYSTEM METRICS
        ==============================
        Uncertainty (entropy): ${confidenceMetrics?.entropy ? Math.round(confidenceMetrics.entropy * 100) + "%" : "unknown"}
        Top intents: ${topIntentsInfo}

        ==============================
        AVAILABLE PRODUCTS (if applicable)
        ==============================
        ${productsContext || "No products available for selection"}

        ==============================
        WRITING STYLE
        ==============================
        - Empathetic and helpful
        - Use emojis when appropriate 😊
        - Always respond in SPANISH
        - Be reassuring and offer clear next steps
      `;

    default:
      // Fallback to standard conversational prompt
      return conversationalPrompt({
        business,
        // flowStatus,
        intent: recommendedIntent?.intent,
        retrievedChunks: productsContext ? [productsContext] : [],
      });
  }
}
