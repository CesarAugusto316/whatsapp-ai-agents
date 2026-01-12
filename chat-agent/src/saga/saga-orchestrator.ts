import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";

type Bag = Record<string, unknown>;

const stepConfig = {
  retriesAllowed: true,
  maxAttempts: 5,
  intervalSeconds: 2,
  backoffRate: 2,
} satisfies StepConfig;

type Retry = Pick<
  StepConfig,
  "retriesAllowed" | "maxAttempts" | "intervalSeconds" | "backoffRate"
>;

export interface SagaStep<C, B extends Bag> {
  execute(ctx: C, bag: B): Promise<Bag>;
  compensate?: (ctx: C, bag: B) => Promise<Bag>;
  config?: {
    name: string;
    execute?: Retry;
    compensate?: Retry;
  };
}

export class SagaOrchestrator<Ctx, B extends Bag> {
  private steps: SagaStep<Ctx, B>[] = [];
  private bag = {} as B;
  private readonly ctx: Readonly<Ctx>; // AppContext

  constructor(ctx: Ctx, steps?: SagaStep<Ctx, B>[]) {
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Ctx>;
    this.steps = steps ?? [];
  }

  addStep(step: SagaStep<Ctx, B>) {
    this.steps.push(step);
    return this;
  }

  private async workflow() {
    for (const step of this.steps) {
      try {
        if (step.config?.name) {
          const result = await DBOS.runStep(
            () => step.execute(this.ctx, this.bag),
            {
              name: `execute:${step.config.name}`,
              ...step.config.execute,
            },
          );
          this.bag = { ...this.bag, [step.config.name]: result };
          //
        } else {
          await step.execute(this.ctx, this.bag);
        }
      } catch (error) {
        await this.compensate(); // excutes in reverse order
        throw error;
      }
    }
  }

  execute(name: string) {
    const run = DBOS.registerWorkflow(this.workflow, { name });
    return run();
  }

  /**
   *
   * @description executes compensate functions in reverse order
   */
  private async compensate() {
    for (const step of [...this.steps].toReversed()) {
      if (step.compensate) {
        if (step.config?.name) {
          const result = await DBOS.runStep(
            () => step.compensate!(this.ctx, this.bag),
            {
              name: `compensate:${step.config.name}`,
              ...step.config.compensate,
            },
          );
          this.bag = { ...this.bag, [step.config.name]: result };
          //
        } else {
          await step.compensate(this.ctx, this.bag);
        }
      }
    }
  }
}
