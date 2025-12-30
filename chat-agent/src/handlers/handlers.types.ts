import { ReservationStatus } from "@/ai-agents/agent.types";
import { AppContext } from "@/types/hono.types";

export type FlowResult = string | void | Promise<string | void>;
export type FlowHandler = (
  ctx: Readonly<AppContext>,
  eventType: ReservationStatus,
) => FlowResult;
