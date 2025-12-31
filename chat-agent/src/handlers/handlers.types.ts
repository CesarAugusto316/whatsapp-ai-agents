export type HandlerResult = string | undefined;

export type StateHandler<Ctx, S extends string> = (
  ctx: Readonly<Ctx>,
  state: S,
) => Promise<HandlerResult> | HandlerResult;
