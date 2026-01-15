import { CLASSIFIER_PROMPT } from "@/domain/restaurant/reservations/prompts/classifier-prompts";
import { validationPrompts } from "@/domain/restaurant/reservations/prompts/validation-prompts";
import {
  CUSTOMER_INTENT,
  InputIntent,
} from "@/domain/restaurant/reservations/reservation.types";
import {
  customerIntentSchema,
  inputIntentSchema,
} from "@/domain/restaurant/reservations/schemas";
import { aiClient } from "@/infraestructure/http/ai/ai.client";

export const intentClassifierAgent = {
  /**
   *
   * @description Classifies the customer intent based on the conversation history.
   * @param messages
   * @returns
   */
  async howOrWhat(message: string): Promise<CUSTOMER_INTENT> {
    try {
      const temperature = 0.1;
      const raw = await aiClient.userMsg(
        [{ role: "user", content: message }],
        CLASSIFIER_PROMPT,
        temperature,
      ); // Llamamos a aiClient usando CLASSIFIER_PROMPT como system

      const { success, data } = customerIntentSchema.safeParse(raw);
      if (success) return data;
      return CUSTOMER_INTENT.WHAT; // fallback
    } catch (err) {
      console.error("Error clasificando la intención del usuario:", err);
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
      const temperature = 0.1;
      const raw = await aiClient.userMsg(
        [{ role: "user", content: message }],
        validationPrompts.intentClassifier(),
        temperature,
      ); // Llamamos a aiClient usando CLASSIFIER_PROMPT como system

      const { success, data } = inputIntentSchema.safeParse(raw);
      if (success) return data;
      return InputIntent.CUSTOMER_QUESTION; // fallback
    } catch (err) {
      console.error("Error clasificando la intención del usuario:", err);
      return InputIntent.CUSTOMER_QUESTION; // fallback en caso de error
    }
  },
};
