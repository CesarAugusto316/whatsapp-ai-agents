import { WorkflowResult, StateWorkflowHandler } from "./state-workflow.types";

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

  on(state: S, handler: StateWorkflowHandler<Ctx, S>): this {
    (this.handlers[state] ??= []).push(handler);
    return this;
  }

  async run(): Promise<WorkflowResult> {
    const status = this.status;
    if (!status) return;

    const handlers = this.handlers[status] ?? [];
    for (const h of handlers) {
      const res = await h(this.ctx, status);
      if (res) return res;
    }
  }
}
