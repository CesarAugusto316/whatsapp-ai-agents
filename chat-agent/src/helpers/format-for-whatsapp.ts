/**
 *
 * @description Convierte el formato Markdown estándar (y otros elementos) al formato nativo de WhatsApp.
 * WhatsApp usa *texto* para negrita y _texto_ para cursiva[citation:2][citation:3][citation:5].
 * @param modelResponse - La respuesta de texto cruda del modelo de lenguaje (ej. OpenAI).
 * @returns El texto formateado correctamente para WhatsApp.
 */
export function formatForWhatsApp(modelResponse: string): string {
  let formatted = modelResponse;

  // 1. ELIMINAR BLOQUES DE CITA (>) QUE EL MODELO AGREGA INDESEABLEMENTE
  // Ej: "> **Cómo hacer...**" -> "Cómo hacer..."
  formatted = formatted.replace(/^>\s*/gm, ""); // Elimina '>' al inicio de línea

  // 2. CONVERTIR ENCABEZADOS MARKDOWN (#, ##, ###, etc.) A NEGRITA DE WHATSAPP
  // Convierte líneas que comienzan con # seguido de espacio a negrita, manteniendo el texto original.
  // Ej: "### 🍕 Pizzas Clásicas..." -> "*🍕 Pizzas Clásicas...*"
  formatted = formatted.replace(/^#+\s+(.*)/gm, "*$1*");

  // 3. CONVERTIR NEGRITA de Markdown estándar (**texto**) a WhatsApp (*texto*)
  // Maneja casos con espacios y también texto pegado a los asteriscos.
  // Expresión regular más robusta
  formatted = formatted.replace(/\*\*(\*?[^*]+?\*?)\*\*/g, "*$1*");

  // 4. CONVERTIR NEGRITA de Markdown alternativo (__texto__) a WhatsApp (*texto*)
  formatted = formatted.replace(/__([^_]+?)__/g, "*$1*");

  // 5. UN CASO ESPECIAL CRÍTICO: Números entre comillas y negrita **"1"** -> *1*
  // El modelo tiende a generar esto. Lo convertimos directamente.
  formatted = formatted.replace(/\*\*"(\d+)"\*\*/g, "*$1*");
  // También para el formato ya con asterisco simple pero con comillas: "*\"1\""* -> *1*
  formatted = formatted.replace(/\*"(\d+)"\*/g, "*$1*");

  // 6. (Opcional) Asegurar que la cursiva use guión bajo (_) como WhatsApp espera[citation:2][citation:5].
  // Si el modelo usa * para cursiva (Markdown estándar), la conversión anterior ya la habrá convertido a negrita.
  // Es mejor forzar el estándar de WhatsApp: _cursiva_.
  // Convertir *cursiva* (cuando no es un número o un comando claro) a _cursiva_
  // Esta regla es compleja y puede tener efectos secundarios. Se puede omitir inicialmente.
  // formatted = formatted.replace(/(?<!\*)\*(\*?[^*\d"'][^*]+?\*?)\*(?!\*)/g, '_$1_');

  // 7. Limpiar múltiples saltos de línea consecutivos para un mensaje más compacto
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted.trim();
}
