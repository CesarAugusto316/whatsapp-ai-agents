import { humanizerPrompt } from "@/domain/restaurant/reservations/prompts";
import { aiClient } from "@/infraestructure/http/ai";

export async function humanizerAgent(message: string, temp = 0.5) {
  const content = await aiClient.systemMsg(humanizerPrompt(message), temp);
  if (!content) {
    throw new Error("No se recibió respuesta del humanizer agent");
  }
  return content;
}
