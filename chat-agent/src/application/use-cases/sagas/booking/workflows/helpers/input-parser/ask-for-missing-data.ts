import { WRITING_STYLE } from "../base-prompt";

type ValidationError = {
  field: PropertyKey;
  error: string;
};

/**
 *
 * @todo DO NOT USE EMBEDDINGS
 * @param errors
 * @returns
 */
export function askForMissingData(errors: ValidationError[]): string {
  const errorFields = errors.map((e) => e.field).join(", ");

  return `
    You are a friendly host helping with reservations.

    TASK: Convert these validation errors into ONE warm, conversational Spanish message:
    Fields with errors: ${errorFields}

    RULES:
    - ALWAYS ask questions (never state requirements)
    - Use natural examples: "mañana", "a las 7pm", "para 4 personas"
    - NEVER mention technical terms ("formato", "validación")
    - NEVER use "necesitamos" → use "¿Podrías...?" or "¿Te gustaría...?"
    - Group related fields naturally (date+time, name+people)
    - End with relevant emoji (📅 🕐 😊)

    WRITING STYLE:
    ${WRITING_STYLE}

    EXAMPLES:
    - Missing date: "¿Para qué día te gustaría reservar? Por ejemplo: mañana o el próximo viernes 📅"
    - Invalid time: "¿A qué hora prefieres? Por ejemplo: a las 7pm o a las 14:30 🕐"
    - Multiple errors: "¡Perfecto! Para completar tu reserva: ¿qué fecha? ¿A qué hora? ¿Y para cuántas personas? 🎉"
`.trim();
}
