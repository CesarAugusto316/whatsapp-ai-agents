import { StepConfig } from "@dbos-inc/dbos-sdk";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import whatsappClient from "@/infraestructure/http/whatsapp/whatsapp.client";
import {
  FuncSagaStep,
  ISagaStep,
  SagaBag,
} from "@/application/patterns/saga-orchestrator/saga-orchestrator";
import { reservationWorkflow } from "../workflows/reservations/reservation.workflow";

/**
 * Configuration for all saga steps in the WhatsApp workflow.
 * This defines retry behavior for durable operations in case of transient failures.
 *
 * Saga Pattern Note: The retry mechanism ensures each step is attempted multiple times
 * before failing, which is important for maintaining workflow durability.
 */
const stepConfig = {
  retriesAllowed: true, // Enable automatic retries on failure
  maxAttempts: 5, // Maximum number of retry attempts
  intervalSeconds: 2, // Initial delay between retries (seconds)
  backoffRate: 2, // Exponential backoff multiplier for subsequent retries
} satisfies Omit<StepConfig, "name">;

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
 * Generic type definitions for the WhatsApp saga workflow.
 * Provides type safety for context, results, and step keys throughout the saga.
 *
 * @template C - Context type (defaults to AppContext)
 * @template R - Result type (defaults to WhatsappSagaResults)
 * @template K - Step key type (defaults to WhatappStepName)
 */
export type WhatsappSagaTypes<
  C = RestaurantCtx,
  R = WhatsappSagaResults,
  K = WhatappStepName,
> = {
  Ctx: C; // Execution context containing session and customer info
  Result: R; // Result type for saga steps
  Key: K; // Step identifier type
};

/**
 * Type alias for WhatsApp saga steps using the defined type parameters.
 * Ensures all steps use consistent typing for context, results, and keys.
 */
type WhatsappSagaStep = ISagaStep<
  WhatsappSagaTypes["Ctx"],
  WhatsappSagaTypes["Result"],
  WhatsappSagaTypes["Key"]
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
export const sendSeen: WhatsappSagaStep = {
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
  WhatsappSagaTypes["Ctx"],
  WhatsappSagaTypes["Result"],
  WhatsappSagaTypes["Key"]
> = async ({ ctx, retryStep }) => {
  const args = {
    session: ctx.session,
    chatId: ctx.customerPhone,
  };
  return retryStep(
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
export const sendStartTyping: WhatsappSagaStep = {
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
export const reservationWorklow: WhatsappSagaStep = {
  config: {
    execute: { name: "reservationFlow", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const res = await reservationWorkflow(ctx);
    return { text: res };
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
export const sendStopTyping: WhatsappSagaStep = {
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
export const sendText: WhatsappSagaStep = {
  config: {
    execute: { name: "sendText", ...stepConfig },
  },
  execute: async ({ ctx, retryStep, getStepResult }) => {
    // Retrieve the text result from the reservationFlow step
    const text = getStepResult("execute", "reservationFlow")?.text ?? "";

    const args = {
      text,
      session: ctx.session,
      chatId: ctx.customerPhone,
    };

    return retryStep(
      async () =>
        (await whatsappClient
          .sendText(args)
          .then((r) => r.json())) as WhatsappSagaResults,
    );
  },
};
