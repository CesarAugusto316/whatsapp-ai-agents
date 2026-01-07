/**
 *
 * @description Parse input string to object
 * @param arg input schema from LLM that is passed to the ai-sdk for tool decision
 * @returns
 */
export const parseInput = (arg: string | Record<string, string>) => {
  if (typeof arg === "string") {
    try {
      // El modelo devuelve un string con comillas externas y JSON dentro.
      // Primero, quitamos las comillas exteriores.
      let str = arg.trim();
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1);
      }
      // Parseamos el JSON interno
      return JSON.parse(str);
    } catch (error) {
      // Si falla, devolvemos el argumento original para que la validación falle
      console.error("Failed to parse input:", arg, error);
      return {};
    }
  }
  // Si no es string, lo devolvemos tal cual (debería ser objeto)
  return arg;
};

/**
 * Convierte el formato Markdown estándar (y otros elementos) al formato nativo de WhatsApp.
 * WhatsApp usa *texto* para negrita y _texto_ para cursiva[citation:2][citation:3][citation:5].
 * @param modelResponse - La respuesta de texto cruda del modelo de lenguaje (ej. OpenAI).
 * @returns El texto formateado correctamente para WhatsApp.
 */
export function formatForWhatsApp(modelResponse: string): string {
  let formatted = modelResponse;

  // 1. ELIMINAR BLOQUES DE CITA (>) QUE EL MODELO AGREGA INDESEABLEMENTE
  // Ej: "> **Cómo hacer...**" -> "Cómo hacer..."
  formatted = formatted.replace(/^>\s*/gm, ""); // Elimina '>' al inicio de línea

  // 2. CONVERTIR NEGRITA de Markdown estándar (**texto**) a WhatsApp (*texto*)
  // Maneja casos con espacios y también texto pegado a los asteriscos.
  // Expresión regular más robusta
  formatted = formatted.replace(/\*\*(\*?[^*]+?\*?)\*\*/g, "*$1*");

  // 3. CONVERTIR NEGRITA de Markdown alternativo (__texto__) a WhatsApp (*texto*)
  formatted = formatted.replace(/__([^_]+?)__/g, "*$1*");

  // 4. UN CASO ESPECIAL CRÍTICO: Números entre comillas y negrita **"1"** -> *1*
  // El modelo tiende a generar esto. Lo convertimos directamente.
  formatted = formatted.replace(/\*\*"(\d+)"\*\*/g, "*$1*");
  // También para el formato ya con asterisco simple pero con comillas: "*\"1\""* -> *1*
  formatted = formatted.replace(/\*"(\d+)"\*/g, "*$1*");

  // 5. (Opcional) Asegurar que la cursiva use guión bajo (_) como WhatsApp espera[citation:2][citation:5].
  // Si el modelo usa * para cursiva (Markdown estándar), la conversión anterior ya la habrá convertido a negrita.
  // Es mejor forzar el estándar de WhatsApp: _cursiva_.
  // Convertir *cursiva* (cuando no es un número o un comando claro) a _cursiva_
  // Esta regla es compleja y puede tener efectos secundarios. Se puede omitir inicialmente.
  // formatted = formatted.replace(/(?<!\*)\*(\*?[^*\d"'][^*]+?\*?)\*(?!\*)/g, '_$1_');

  // 6. Limpiar múltiples saltos de línea consecutivos para un mensaje más compacto
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted.trim();
}
