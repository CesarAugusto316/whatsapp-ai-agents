import { RestaurantCtx } from "@/domain/restaurant/context.types";
import whatsappClient from "@/infraestructure/http/whatsapp/whatsapp.client";
import {
  FuncSagaStep,
  ISagaStep,
  SagaBag,
  SagaOrchestrator,
  stepConfig,
} from "@/application/patterns/saga-orchestrator/saga-orchestrator";
import { reservationSagaOrchestrator } from "./reservations/reservation-flow-orchestrator";

/**
 * Defines all possible step names in the WhatsApp saga workflow.
 * Each step represents a distinct operation in the message processing flow.
 */
type WhatappStepName =
  | "sendSeen" // Mark message as seen in WhatsApp
  | "sendStartTyping" // Show typing indicator to user
  | "reservationFlow" // Execute reservation business logic
  | "sendStopTyping" // Hide typing indicator
  | "sendText"; // Send final text response

/**
 * The result structure for WhatsApp saga steps.
 * Extends the base SagaBag to include text content that will be sent to the user.
 */
interface WhatsappSagaResults extends SagaBag {
  text: string; // The formatted text content to be sent via WhatsApp
}

/**
 * Type alias for WhatsApp saga steps using the defined type parameters.
 * Ensures all steps use consistent typing for context, results, and keys.
 */
type WhatsappSagaStep = ISagaStep<
  RestaurantCtx,
  WhatsappSagaResults,
  WhatappStepName
>;

/**
 * SAGA STEP 1: Mark message as seen
 *
 * Purpose: Acknowledge receipt of the user's message by marking it as "seen" in WhatsApp.
 * This provides user feedback that their message was received.
 *
 * Saga Pattern Role: Initial step in the forward execution flow.
 * No compensation needed as this is a read-only acknowledgment.
 */
const sendSeen: WhatsappSagaStep = {
  config: {
    execute: { name: "sendSeen", ...stepConfig },
  },
  execute: async ({ ctx, retryStep }) => {
    const args = {
      session: ctx.session,
      chatId: ctx.customerPhone,
    };
    return retryStep(
      async () =>
        (await whatsappClient
          .sendSeen(args)
          .then((r) => r.json())) as WhatsappSagaResults,
    );
  },
};

/**
 * Compensation function for sendStartTyping step.
 *
 * Purpose: If the sendStartTyping step fails during compensation phase,
 * this function ensures the typing indicator is stopped.
 *
 * Saga Pattern Note: Compensation functions undo the effects of their corresponding
 * execute functions. This implements the "undo" capability of the Saga pattern.
 */
const sendStopTypingCompensate: FuncSagaStep<
  RestaurantCtx,
  WhatsappSagaResults,
  WhatappStepName
> = async ({ ctx, durableStep }) => {
  const args = {
    session: ctx.session,
    chatId: ctx.customerPhone,
  };
  return durableStep(
    async () =>
      (await whatsappClient
        .sendStopTyping(args)
        .then((r) => r.json())) as WhatsappSagaResults,
  );
};

/**
 * SAGA STEP 2: Show typing indicator
 *
 * Purpose: Display "typing..." indicator to the user while processing their request.
 * This improves user experience by showing that the system is actively working.
 *
 * Saga Pattern Role: Has both execute and compensate functions.
 * - Execute: Starts typing indicator
 * - Compensate: Stops typing indicator (uses sendStopTypingCompensate)
 *
 * Compensation Logic: If any subsequent step fails, this compensation ensures
 * the typing indicator is turned off, preventing the user from seeing a stuck "typing" state.
 */
const sendStartTyping: WhatsappSagaStep = {
  config: {
    execute: { name: "sendStartTyping", ...stepConfig },
    compensate: { name: "sendStopTyping", ...stepConfig },
  },
  execute: async ({ ctx, retryStep }) => {
    const args = {
      session: ctx.session,
      chatId: ctx.customerPhone,
    };
    return retryStep(
      async () =>
        (await whatsappClient
          .sendStartTyping(args)
          .then((r) => r.json())) as WhatsappSagaResults,
    );
  },
  compensate: sendStopTypingCompensate,
};

/**
 * SAGA STEP 3: Execute reservation workflow
 *
 * Purpose: Run the core business logic for handling reservation requests.
 * This is where the actual reservation processing happens.
 *
 * Saga Pattern Role: Critical business logic step. If this fails,
 * the entire saga should compensate by stopping the typing indicator.
 *
 * Note: This step doesn't have direct WhatsApp API calls but produces
 * the text result that will be sent in the final step.
 */
const reservationSagaStep: WhatsappSagaStep = {
  config: {
    execute: { name: "reservationFlow", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const res = await reservationSagaOrchestrator(ctx);
    return { text: res, continue: true };
  },
};

/**
 * SAGA STEP 4: Stop typing indicator
 *
 * Purpose: Hide the typing indicator after processing is complete.
 * This step is typically executed in the normal forward flow after
 * business logic completes.
 *
 * Saga Pattern Role: Cleanup step that ensures UI state is properly reset.
 * Uses the same function as the compensation for sendStartTyping.
 */
const sendStopTyping: WhatsappSagaStep = {
  config: {
    execute: { name: "sendStopTyping", ...stepConfig },
  },
  execute: sendStopTypingCompensate,
};

/**
 * SAGA STEP 5: Send final text message
 *
 * Purpose: Send the formatted response text to the user via WhatsApp.
 * This is the final output of the reservation workflow.
 *
 * Saga Pattern Role: Final step in the forward execution.
 * Depends on the result from reservationFlow step.
 *
 * Data Flow: Retrieves the text result from the reservationFlow step
 * using getStepResult(), formats it for WhatsApp, and sends it.
 *
 * Saga Pattern Note: This step demonstrates inter-step data passing,
 * a key feature of the Saga pattern where steps can consume results
 * from previous steps.
 */
const sendText: WhatsappSagaStep = {
  config: {
    execute: { name: "sendText", ...stepConfig },
  },
  execute: async ({ ctx, getStepResult, durableStep }) => {
    // Retrieve the text result from the reservationFlow step
    const text = getStepResult("execute:reservationFlow")?.text ?? "";

    const args = {
      text,
      session: ctx.session,
      chatId: ctx.customerPhone,
    };

    return durableStep(
      async () =>
        (await whatsappClient
          .sendText(args)
          .then((r) => r.json())) as WhatsappSagaResults,
    );
  },
};

// 1. Initialize the WhatsApp Saga
export const whatsappSagaOrchestrator = (ctx: RestaurantCtx) => {
  return new SagaOrchestrator<
    RestaurantCtx,
    WhatsappSagaResults,
    WhatappStepName
  >({
    ctx,
    dbosConfig: {
      workflowName: `whatsapp:reservation:${ctx.businessId}:${ctx.customerPhone}`,
    },
  })
    .addStep(sendSeen)
    .addStep(sendStartTyping)
    .addStep(reservationSagaStep)
    .addStep(sendStopTyping)
    .addStep(sendText)
    .start();
};
