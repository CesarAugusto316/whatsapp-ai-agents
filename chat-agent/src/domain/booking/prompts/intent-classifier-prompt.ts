import type {
  AllDomainKind,
  IntentExampleKey,
  ModuleKind,
  PolicyDecision,
} from "@/application/services/pomdp";
import type { DomainCtx } from "@/domain/booking";
import {
  PolicyTemplateData,
  policyTemplates,
} from "./helpers/policy-templates";

/**
 * Generates a dynamic prompt based on the PolicyEngine decision.
 *
 * POLICY ENGINE CONTEXT:
 * - PolicyEngine decides based on `requiresConfirmation` + user signals
 * - requiresConfirmation: "never" → execute | "maybe" → execute if confident | "always" → ask confirmation
 * - User signals: isConfirmed (sí) | isRejected (no) | isUncertain (no sé/talvez)
 *
 * DOMAIN + MODULE ARCHITECTURE:
 * - businessType determina el dominio (restaurant, real-estate, erotic, retail, medical)
 * - Modules son condicionales según el dominio
 * - Vocabulario específico por dominio + módulo activo
 *
 * DOMAIN MODULES:
 * - restaurant: booking (reservas), products (menú), orders (pedidos), delivery (entrega)
 * - real-estate: booking (visitas/citas)
 * - erotic: booking (citas), products (catálogo), orders (pedidos)
 * - retail: products (catálogo), orders (pedidos), delivery (entrega)
 * - medical: booking (citas médicas)
 */
export function intentClassifierPrompt(
  ctx: DomainCtx,
  policy: PolicyDecision,
): string {
  const currentIntent = policy?.intent;
  const { business, activeModules } = ctx;
  const businessType = business.general.businessType as AllDomainKind;

  // Extract intent data for dynamic prompts
  const intentKey = (currentIntent?.intentKey as IntentExampleKey) || "unknown";
  const requiresConfirmation = currentIntent?.requiresConfirmation || "always";
  const intentModule = (currentIntent?.module as ModuleKind) || "unknown";
  const alternatives = currentIntent?.alternatives || [];
  const intentScore = currentIntent?.score || 0;

  // Build template data
  const templateData: PolicyTemplateData = {
    ctx,
    policy,
    businessType,
    activeModules,
    intentKey,
    intentModule,
    alternatives,
    intentScore,
    requiresConfirmation,
  };

  // Select and execute template
  const policyType = policy?.type as keyof typeof policyTemplates;
  const template = policyTemplates[policyType];

  if (!template) {
    // Fallback para policy type desconocido
    return policyTemplates.unknown_intent({
      ...templateData,
      policy: { ...policy, type: "unknown_intent" } as any,
    });
  }

  return template(templateData);
}
