import { BookingState } from "./booking.types";
import { ContextProps } from "../context.types";
import { Context } from "hono";

export type DomainCtx = ContextProps<
  BookingState,
  {} // ProductOrderState
>;

export interface ModuleCtx extends Context {
  Variables: DomainCtx;
}
