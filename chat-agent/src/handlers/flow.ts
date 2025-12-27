import { ReStatus } from "@/ai-agents/agent.types";
import { CtxState } from "@/types/hono.types";

type FlowResult = string | void | Promise<string | void>;

type FlowHandler = (ctx: Readonly<Partial<CtxState>>) => FlowResult;

export class Flow {
  private handlers: Record<string, FlowHandler[]> = {};

  constructor(public readonly ctx: Readonly<Partial<CtxState>>) {}

  on(event: keyof typeof ReStatus, handler: FlowHandler): this {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }

  async run(): Promise<FlowResult> {
    const status = this.ctx.currentReservation?.status;
    if (!status) return;

    const handlers = this.handlers[status] ?? [];
    for (const h of handlers) {
      const res = await h(this.ctx);
      if (res) return res;
    }
  }
}

export async function reservationFlow(
  ctx: Partial<CtxState>,
): Promise<string | void> {
  const flow = new Flow(ctx);

  // flow.on("MAKE", async (ctx) => {
  //   const { currentReservation, customerMessage } = ctx;

  //   if (currentReservation?.step !== ReservationStep.STARTED) return;
  //   if (!customerMessage) return;

  //   return "Procesando reserva...";
  // });

  flow
    .on("CANCEL_STARTED", async (ctx) => {
      // if (ctx.currentReservation?.step !== ReservationStep.STARTED) return;
      // if (!ctx.customerMessage) return;

      return "Validando datos…";
    })
    .on("CANCEL_VALIDATED", async (ctx) => {
      if (!ctx.customer) {
        return "Debes registrarte primero";
      }
    })
    .on("UPDATE_STARTED", async (ctx) => {
      if (ctx.currentReservation?.id) {
        return `Reserva ${ctx.currentReservation.id} cancelada`;
      }
    });

  return flow.run();
}
