import {
  CLASSIFIER_PROMPT,
  validationPrompts,
} from "@/domain/restaurant/booking/prompts";
import { CUSTOMER_INTENT, InputIntent } from "@/domain/restaurant/booking";
import {
  customerIntentSchema,
  inputIntentSchema,
} from "@/domain/restaurant/booking/schemas";
import { aiAdapter } from "@/infraestructure/adapters/ai";
import { logger } from "@/infraestructure/logging";

export const intentClassifierAgent = {
  /**
   *
   * @description Classifies the customer intent based on the conversation history.
   * @param messages
   * @returns
   */
  async howOrWhat(message: string): Promise<CUSTOMER_INTENT> {
    try {
      const raw = await aiAdapter.generateText({
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: message },
        ],
      }); // Llamamos a aiClient usando CLASSIFIER_PROMPT como system

      const { success, data } = customerIntentSchema.safeParse(raw);
      if (success) return data;
      return CUSTOMER_INTENT.WHAT; // fallback
    } catch (err) {
      logger.error(
        "Error clasificando la intención del usuario:",
        err as Error,
      );
      return CUSTOMER_INTENT.WHAT; // fallback en caso de error
    }
  },

  /**
   *
   * @description Classifies the customer intent based on the conversation history.
   * @param messages
   * @returns
   */
  async inputIntent(message: string): Promise<InputIntent> {
    try {
      const raw = await aiAdapter.generateText({
        messages: [
          { role: "system", content: validationPrompts.intentClassifier() },
          { role: "user", content: message },
        ],
      }); // Llamamos a aiClient usando CLASSIFIER_PROMPT como system

      const { success, data } = inputIntentSchema.safeParse(raw);
      if (success) return data;
      return InputIntent.CUSTOMER_QUESTION; // fallback
    } catch (err) {
      logger.error(
        "Error clasificando la intención del usuario:",
        err as Error,
      );
      return InputIntent.CUSTOMER_QUESTION; // fallback en caso de error
    }
  },
};
