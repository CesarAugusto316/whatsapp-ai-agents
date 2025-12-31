import { ReservationStatus } from "@/ai-agents/agent.types";
import { AppContext } from "@/types/hono.types";

export type StateResult = string | void | Promise<string | void>;
export type StateHandler = (
  ctx: Readonly<AppContext>,
  eventType: ReservationStatus,
) => StateResult;
