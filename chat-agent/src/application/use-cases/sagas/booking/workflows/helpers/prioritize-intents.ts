import {
  IntentPayloadWithScore,
  ModuleKind,
} from "@/application/services/pomdp";

// Definir prioridades de módulos/intents
const MODULE_PRIORITY: Record<ModuleKind, number> = {
  "social-protocol": 1, // Saludos, despedidas, gracias → baja prioridad
  "conversational-signal": 1, // Confirmaciones, negaciones → baja prioridad
  informational: 2, // Información básica → media prioridad
  booking: 3, // Reservas → alta prioridad
  restaurant: 3, // Pedidos → alta prioridad
  erotic: 3, // Contenido adulto → alta prioridad
  "real-state": 3, // Bienes raíces → alta prioridad
};

// Función para priorizar intents
export function prioritizeIntents(
  intents: IntentPayloadWithScore[],
): IntentPayloadWithScore[] {
  //
  if (intents.length > 2) {
    throw new Error("Too many intents");
  }
  if (intents.length < 2) return intents;

  const sortedByScore = [...intents].sort((a, b) => b.score - a.score);

  // Si el primer intent es de baja prioridad y hay otro de mayor prioridad
  const firstIntent = sortedByScore[0];
  const secondIntent = sortedByScore[1];

  const firstPriority = MODULE_PRIORITY[firstIntent.module] || 2;
  const secondPriority = MODULE_PRIORITY[secondIntent.module] || 2;

  // Si el primero es saludo y el segundo es acción concreta, swappear
  if (firstPriority < secondPriority && firstIntent.score > 0.7) {
    // Solo swappear si el saludo tiene score alto (es realmente un saludo)
    // y la diferencia de score no es enorme (evitar false positives)
    const scoreDiff = firstIntent.score - secondIntent.score;
    if (scoreDiff < 0.2) {
      return [secondIntent, firstIntent, ...sortedByScore.slice(2)];
    }
  }

  return sortedByScore;
}
