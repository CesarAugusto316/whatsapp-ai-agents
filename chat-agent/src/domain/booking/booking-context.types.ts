import { BookingState } from "./booking.types";
import { ContextProps } from "../context.types";
import { Context } from "hono";
import { ProductOrderState } from "../orders";

export type DomainCtx = ContextProps<BookingState, ProductOrderState>;

export interface ModuleCtx extends Context {
  Variables: DomainCtx;
}
