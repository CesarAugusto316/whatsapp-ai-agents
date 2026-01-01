import { HandlerResult, StateHandler } from "./state-handler.types";

/**
 *
 * @description deterministic chat flow, here core business logic lives
 */
export class StateRouter<Ctx, S extends string> {
  private handlers: Partial<Record<S, StateHandler<Ctx, S>[]>> = {};

  constructor(
    private readonly ctx: Readonly<Ctx>,
    private readonly status?: S,
  ) {}

  on(state: S, handler: StateHandler<Ctx, S>): this {
    (this.handlers[state] ??= []).push(handler);
    return this;
  }

  async run(): Promise<HandlerResult> {
    const status = this.status;
    if (!status) return;

    const handlers = this.handlers[status] ?? [];
    for (const h of handlers) {
      const res = await h(this.ctx, status);
      if (res) return res;
    }
  }
}
