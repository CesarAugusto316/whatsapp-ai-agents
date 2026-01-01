export type WorkflowResult = string | undefined;

export type StateWorkflowHandler<Ctx, S extends string> = (
  ctx: Readonly<Ctx>,
  state: S,
) => Promise<WorkflowResult> | WorkflowResult;
