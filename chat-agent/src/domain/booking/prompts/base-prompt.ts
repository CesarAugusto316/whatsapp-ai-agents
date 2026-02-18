import { DomainCtx } from "@/domain/booking";
import { generateAgentGoals } from "./agent-goals";
import { WRITING_STYLE, SECURITY_RULES } from "./global-rules";

export function basePrompt(ctx: DomainCtx) {
  const { business, activeModules } = ctx;
  const businessName = `${business.general.businessType} ${business.name}`;
  const assistantName = business.assistantName;
  const agentGoals = generateAgentGoals(activeModules);

  return `
    You are ${assistantName}, an assistant for ${businessName}.

    AGENT GOALS:
    ${agentGoals}

    ${WRITING_STYLE}

    ${SECURITY_RULES}

    ${
      ctx.customer?.name
        ? `CUSTOMER NAME:
      ${ctx.customer?.name}`
        : ""
    }
  `.trim();
}
