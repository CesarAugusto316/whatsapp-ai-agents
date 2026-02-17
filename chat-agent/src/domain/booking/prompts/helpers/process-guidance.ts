import type { ModuleKind } from "@/application/services/pomdp";

/**
 * Patrones que indican que el usuario pregunta sobre el proceso del sistema
 * (no preguntas generales como "cómo estás")
 */
const howToPatterns = [
  /cómo\s+(puedo|reservar|pedir|hacer|funciona)/i,
  /como\s+(puedo|reservar|pedir|hacer|funciona)/i,
  /qué\s+necesito\s+(para|para\s+(reservar|pedir))/i,
  /cuál\s+es\s+el\s+(proceso|paso)/i,
  /explícame\s+(el\s+proceso|cómo)/i,
  /me\s+dices\s+(cómo|el\s+proceso)/i,
];

/**
 * Retorna guía rápida del proceso solo para módulos críticos (booking, orders)
 *
 * CUÁNDO SE MUESTRA:
 * - Solo cuando el usuario pregunta explícitamente "cómo funciona el sistema"
 * - Solo para módulos booking y orders (operaciones CRUD)
 */
export function getProcessGuidance(
  module: ModuleKind,
  userMessage: string,
): string {
  const userAskedHow = howToPatterns.some((pattern) =>
    pattern.test(userMessage),
  );

  if (!userAskedHow) return "";

  const guides: Record<ModuleKind, string> = {
    booking:
      "\n\nQUICK GUIDE — CUANDO USUARIO PREGUNTA CÓMO FUNCIONA:\nPara reservar: Nombre + Fecha/Hora + N Personas → Confirmo ✅",
    orders:
      "\n\nQUICK GUIDE — CUANDO USUARIO PREGUNTA CÓMO FUNCIONA:\nPara pedir: Producto + Cantidad + Entrega/Recogida → Confirmo ✅",
    products: "",
    delivery: "",
    informational: "",
    "social-protocol": "",
    "conversational-signal": "",
  };

  return guides[module] || "";
}
