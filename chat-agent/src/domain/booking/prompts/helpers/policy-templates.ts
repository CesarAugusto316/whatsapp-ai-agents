import type {
  AllDomainKind,
  IntentExampleKey,
  ModuleKind,
  PolicyDecision,
} from "@/application/services/pomdp";
import type { RestaurantCtx } from "@/domain/restaurant";
import { basePrompt } from "../base-prompt";
import {
  getActionVerb,
  getDomainCapabilities,
  getFilteredAlternatives,
} from "./vocabulary";
import { getProcessGuidance } from "./process-guidance";

/**
 * Datos comunes para todos los policy templates
 */
export interface PolicyTemplateData {
  ctx: RestaurantCtx;
  policy: PolicyDecision;
  businessType: AllDomainKind;
  activeModules: ModuleKind[];
  intentKey: IntentExampleKey;
  intentModule: ModuleKind;
  alternatives: NonNullable<PolicyDecision["intent"]>["alternatives"];
  intentScore: number;
  requiresConfirmation: string;
}

/**
 * Template: unknown_intent
 * ~150 tokens
 */
export function unknownIntentTemplate(data: PolicyTemplateData): string {
  const { ctx, policy, businessType, activeModules } = data;

  return `
${basePrompt(ctx)}

POLICY: ${policy?.type} — Usuario escribió algo no reconocido. Presenta capacidades.

DOMINIO: ${businessType}
MÓDULOS: ${activeModules
    .filter(
      (m) =>
        !["informational", "social-protocol", "conversational-signal"].includes(
          m,
        ),
    )
    .join(", ")}

CAPACIDADES:
${getDomainCapabilities({ activeModules, businessType })}

RESPONDE:
- NO digas "no entendí" — presenta capacidades cálidamente
- NO pidas datos (fecha, hora, personas) si no hay intención clara
- Pide que sea explícito: "¿Quieres reservar, pedir comida o ver el menú?"
- Cierra: "¿Qué prefieres hoy?"
`.trim();
}

/**
 * Template: ask_clarification
 * ~120 tokens
 */
export function askClarificationTemplate(data: PolicyTemplateData): string {
  const {
    ctx,
    policy,
    businessType,
    intentModule,
    intentKey,
    intentScore,
    alternatives,
  } = data;
  const filteredAlts = getFilteredAlternatives(alternatives, intentKey);

  const userMessage = policy?.state?.current?.text || "";
  const processGuidance = getProcessGuidance(intentModule, userMessage);

  return `
${basePrompt(ctx)}

POLICY: ${policy?.type} — Usuario ambiguo. Intent: ${intentKey} (score: ${intentScore.toFixed(2)})

${processGuidance}

ALTERNATIVAS:
${filteredAlts.length > 0 ? filteredAlts.map((alt) => `- ${alt.intentKey}`).join("\n") : "Sin alternativas"}

RESPONDE (2-3 líneas):
- Reconocimiento: "Vale" / "Claro" + emoji
- Ofrece 2 opciones de alternativas con "o": "¿Quieres ${getActionVerb(filteredAlts[0]?.intentKey, businessType).toLowerCase() || "X"} o ${getActionVerb(filteredAlts[1]?.intentKey, businessType).toLowerCase() || "Y"}?"
- Cierra: "Dime cuál y te ayudo 😊"

RULES:
- NO menciones ambigüedad ni scores
- NO más de 2 opciones
- Adapta vocabulario a ${businessType}
`.trim();
}

/**
 * Template: clear_up_uncertainty
 * ~100 tokens
 */
export function clearUpUncertaintyTemplate(data: PolicyTemplateData): string {
  const { ctx, policy, businessType, intentKey, alternatives } = data;
  const filteredAlts = getFilteredAlternatives(alternatives, intentKey);

  return `
${basePrompt(ctx)}

POLICY: ${policy?.type} — Usuario indeciso

ALTERNATIVAS (excluyendo ${intentKey}):
${filteredAlts.length > 0 ? filteredAlts.map((alt) => `- ${alt.intentKey}`).join("\n") : "Sin alternativas — usa opciones genéricas"}

RESPONDE (1 línea):
- Empático: "Vale" / "Tranquilo" + emoji
- 2 opciones de filteredAlts: "¿[Opción A] o [Opción B]?"
- Emoji final

RULES:
- NO menciones su indecisión
- NO más de 2 opciones (parálisis)
- NO uses ${intentKey}
`.trim();
}

/**
 * Template: ask_confirmation
 * ~130 tokens
 */
export function askConfirmationTemplate(data: PolicyTemplateData): string {
  const { ctx, policy, businessType, intentModule, intentKey } = data;
  const actionVerb = getActionVerb(intentKey, businessType);

  const userMessage = policy?.state?.current?.text || "";
  const userAskedHow = getProcessGuidance(intentModule, userMessage);

  return `
${basePrompt(ctx)}

POLICY: ${policy?.type} — Requiere confirmación

INTENCIÓN: ${intentKey}
ACCIÓN: ${actionVerb}
${userAskedHow}

RESPONDE:
- Conector natural (varía): "¡Perfecto!" / "¡Claro!" / "Vale" / "¡Genial!" / "¡Vamos!" + emoji
- Confirma INTENCIÓN con variedad:
  · "¿Te gustaría ${actionVerb.toLowerCase()} ahora?"
  · "¿Quieres que ${actionVerb.toLowerCase()}?"
  · "¿Procedemos?"
  · "¿Damos el siguiente paso?"
- Cierra con variedad: "¿Qué dices?" / "¿Te animas?" / "¿Cómo lo ves?" / "¿Sí o no?"

RULES:
- Máximo 2-3 líneas
- VARÍA conectores y cierres (no repitas siempre lo mismo)
- NO pidas datos (fecha, hora, personas) — solo confirma intención
- Si el usuario preguntó "cómo" (ya está en el prompt arriba): 1 línea de proceso + oferta
- NO "¿Estás seguro?" (ansiedad)
- Usuario responde: "sí" | "no" | "no sé"
`.trim();
}

/**
 * Template: propose_alternative
 * ~120 tokens
 */
export function proposeAlternativeTemplate(data: PolicyTemplateData): string {
  const { ctx, policy, businessType, intentModule, intentKey, alternatives } =
    data;
  const filteredAlts = getFilteredAlternatives(alternatives, intentKey);
  const sameModuleAlts = filteredAlts.filter(
    (alt) => alt.module === intentModule,
  );

  return `
${basePrompt(ctx)}

POLICY: ${policy?.type} — Usuario rechazó ${intentKey} (isRejected=true). Propón alternativa, NO insistas.

ALTERNATIVAS (excluyendo ${intentKey}):
${filteredAlts.length > 0 ? filteredAlts.map((alt) => `- ${alt.intentKey}`).join("\n") : "Sin alternativas"}

${sameModuleAlts.length > 0 ? `PRIORIDAD: Mismo módulo — ${sameModuleAlts[0].intentKey}` : ""}

RESPONDE:
- 1 alternativa relevante (prioriza sameModuleAlts[0])
- Lenguaje suave: "¿Y si...?", "¿Te viene mejor...?"
- Cierra variado: "¿Qué opinas? ✨" / "¿Te funciona? 😊" / "¿Cómo lo ves? 😄"

RULES:
- 1 alternativa por mensaje
- Mismo módulo: rechazó booking → booking alternativo
- Menor compromiso: menos personas, horario alternativo
- NO uses ${intentKey}
`.trim();
}

/**
 * Template: execute
 * ~140 tokens
 */
export function executeTemplate(data: PolicyTemplateData): string {
  const {
    ctx,
    policy,
    businessType,
    intentModule,
    intentKey,
    requiresConfirmation,
  } = data;
  const actionVerb = getActionVerb(intentKey, businessType);

  return `
${basePrompt(ctx)}

POLICY: ${policy?.type} — Ejecutar inmediatamente. requiresConfirmation: "${requiresConfirmation}".

INTENCIÓN: ${intentKey}
ACCIÓN: ${actionVerb}

POR MÓDULO:

${
  intentModule === "informational"
    ? `INFORMACIÓN:
- Responde con información del contexto
- NO inventes datos
- Cierra: "¿Te ayudo con algo más? 😊"`
    : ""
}

${
  intentModule === "social-protocol" || intentModule === "conversational-signal"
    ? `SOCIAL:
- Responde natural y cálido
- NO ejecutes acciones de negocio
- Mantén conversación fluida`
    : ""
}

${
  intentModule === "booking"
    ? `BOOKING:
- Confirma: "¡Excelente! Voy a ${actionVerb.toLowerCase()}"
- Pide PRIMER dato: "¿Para qué fecha?" / "¿Qué día prefieres?"
- NO pidas confirmación adicional`
    : ""
}

${
  intentModule === "products"
    ? `PRODUCTS:
- Confirma: "¡Perfecto! Aquí tienes nuestro catálogo"
- Ofrece ayuda específica: "¿Algo en particular que busques?"
- NO listes todos los productos`
    : ""
}

${
  intentModule === "orders"
    ? `ORDERS:
- Confirma: "¡Excelente! Voy a ${actionVerb.toLowerCase()}"
- Pide primer dato: "¿Qué te gustaría pedir hoy?"
- NO pidas confirmación adicional`
    : ""
}

RULES:
- NO pidas confirmación (PolicyEngine ya gestionó)
- Pide UN dato a la vez
- Adapta vocabulario a ${businessType}
`.trim();
}

/**
 * Template: default fallback
 * ~100 tokens
 */
export function defaultFallbackTemplate(data: PolicyTemplateData): string {
  const { ctx, policy, businessType, activeModules } = data;
  const { business } = ctx;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;

  return `
${basePrompt(ctx)}

ERROR: PolicyDecision no manejada — type: ${(policy as any)?.type}

FALLBACK:
- Responde genérico y útil
- Módulos activos: ${activeModules
    .filter(
      (m) =>
        !["informational", "social-protocol", "conversational-signal"].includes(
          m,
        ),
    )
    .join(", ")}
- NO menciones error técnico

EJEMPLO:
"Soy ${assistantName} de ${businessName}. Puedo ayudarte con [módulos]. ¿En qué te ayudo?"
`.trim();
}

// ============================================
// Export: Mapeo de policy types a templates
// ============================================

export type PolicyType =
  | "unknown_intent"
  | "ask_clarification"
  | "clear_up_uncertainty"
  | "ask_confirmation"
  | "propose_alternative"
  | "execute";

export const policyTemplates: Record<
  PolicyType,
  (data: PolicyTemplateData) => string
> = {
  unknown_intent: unknownIntentTemplate,
  ask_clarification: askClarificationTemplate,
  clear_up_uncertainty: clearUpUncertaintyTemplate,
  ask_confirmation: askConfirmationTemplate,
  propose_alternative: proposeAlternativeTemplate,
  execute: executeTemplate,
};
