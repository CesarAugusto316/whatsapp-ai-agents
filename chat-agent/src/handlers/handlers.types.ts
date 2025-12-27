import { CtxState } from "@/types/hono.types";

export type FlowResult = string | void | Promise<string | void>;
export type FlowHandler = (ctx: Readonly<CtxState>) => FlowResult;
