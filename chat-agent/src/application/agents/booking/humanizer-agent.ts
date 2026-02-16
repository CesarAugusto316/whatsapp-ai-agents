import { humanizerPrompt } from "@/domain/booking/prompts";
import { aiAdapter } from "@/infraestructure/adapters/ai";

export async function humanizerAgent(message: string, temp = 0) {
  const content = await aiAdapter.generateText({
    messages: [{ role: "system", content: humanizerPrompt(message) }],
  });
  if (!content) {
    throw new Error("No se recibió respuesta del humanizer agent");
  }
  return content;
}
