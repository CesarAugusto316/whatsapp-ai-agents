import { WorkflowResult, StateWorkflowHandler } from "./state-workflow.types";

/**
 *
 * @description  Executes deterministic state workflows.
 * Orchestrates state-bound workflow handlers and returns the first valid result.
 */
export class StateWorkflowRunner<Ctx, S extends string> {
  private handlers: Partial<Record<S, StateWorkflowHandler<Ctx, S>[]>> = {};

  constructor(
    private readonly ctx: Readonly<Ctx>,
    private readonly status?: S,
  ) {}

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
