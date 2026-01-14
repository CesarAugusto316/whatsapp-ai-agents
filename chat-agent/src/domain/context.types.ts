import { Context } from "hono";

export interface DomainCtx<D> extends Context {
  Variables: D;
}
