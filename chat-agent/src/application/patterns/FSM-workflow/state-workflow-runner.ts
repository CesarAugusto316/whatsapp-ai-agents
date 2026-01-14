import { InputIntent } from "@/domain/restaurant/reservations/reservation.types";
import { StateWorkflowHandler } from "./state-workflow.types";

/**
 *
 * @description  Executes deterministic state workflows.
 * Orchestrates state-bound workflow handlers and returns the first valid result.
 */
export class StateWorkflowRunner<Ctx, S extends string> {
  private handlers: Partial<Record<S, StateWorkflowHandler<Ctx, S>[]>> = {};
  private readonly ctx: Readonly<Ctx>; // AppContext
  private readonly status?: S; // Status

  constructor(ctx: Ctx, status?: S) {
    // Copia defensiva profunda o superficial según necesidades
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Ctx>;
    this.status = status;
  }

  on(fmStatus: S, handler: StateWorkflowHandler<Ctx, S>): this {
    (this.handlers[fmStatus] ??= []).push(handler);
    return this;
  }

  async run(key?: string) {
    const status = this.status;
    if (!status) return;

    const workflows = this.handlers[status] ?? [];
    for (const w of workflows) {
      const res = await w(this.ctx, status);

      if (res && res !== InputIntent.CUSTOMER_QUESTION) {
        return { success: true, message: res };
      }
      return { success: false, message: "" };
    }
  }
}
