import { logger } from "@/middlewares/logger-middleware";
import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";
import { StartWorkflowParams } from "node_modules/@dbos-inc/dbos-sdk/dist/src/dbos";

type SagaMode = "execute" | "compensate";

export type Retry = Pick<
  StepConfig,
  "retriesAllowed" | "maxAttempts" | "intervalSeconds" | "backoffRate"
>;

// Tipos para construir inferencias
// type StepKey<M extends SagaMode, K extends string> = `${M}:${K}`;
// type StepResult<T> = T extends Promise<infer U> ? U : T;

// Inferir el Bag de un Step individual
type InferStepBag<S> = S extends ISagaStep<any, infer B> ? B : never;

// Inferir el Bag acumulado de múltiples Steps
// type InferBagFromSteps<Steps extends readonly ISagaStep<any, any>[]> =
//   Steps extends readonly [infer First, ...infer Rest]
//     ? First extends ISagaStep<any, infer B1>
//       ? Rest extends ISagaStep<any, any>[]
//         ? B1 & InferBagFromSteps<Rest>
//         : B1
//       : {}
//     : {};

interface SagaStepResult<B> {
  <K extends keyof B>(mode: SagaMode, stepKey: string): B[K] | undefined;
}

interface DurableStep<T> {
  (func: () => Promise<T>): Promise<T>;
}

export interface FuncSagaStep<C, B> {
  ({
    ctx,
    getStepResult,
    durableStep,
  }: {
    ctx: C;
    getStepResult: SagaStepResult<B>;
    durableStep: DurableStep<any>;
  }): Promise<B>;
}

export interface ISagaStep<C, B extends Record<string, any>> {
  execute: FuncSagaStep<C, B>;
  compensate?: FuncSagaStep<C, B>;
  config?: Partial<Record<SagaMode, StepConfig & { name: string }>>;
}

export class SagaOrchestrator<Context, Bag extends Record<string, any> = {}> {
  private readonly ctx: Readonly<Context>;
  private steps: ISagaStep<Context, any>[];
  private bag: Partial<Bag> = {};
  private executedSteps: string[] = [];
  private readonly dbosConfig?: {
    workflowName?: string;
    args?: StartWorkflowParams;
  };

  constructor({
    ctx,
    steps = [],
    dbosConfig,
  }: {
    ctx: Context;
    steps?: ISagaStep<Context, any>[];
    dbosConfig?: {
      workflowName?: string;
      args?: StartWorkflowParams;
    };
  }) {
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Context>;
    this.steps = steps;
    this.dbosConfig = Object.freeze(structuredClone(dbosConfig));
  }

  private getStepResult = <K extends keyof Bag>(
    mode: SagaMode,
    stepKey: string,
  ): Bag[K] | undefined => {
    const key = `${mode}:${stepKey}` as K;
    return this.bag[key];
  };

  private async runStepMode<S extends ISagaStep<Context, any>>(
    runStepMode: FuncSagaStep<Context, InferStepBag<S>>,
    config: StepConfig & { name: string },
    mode: SagaMode,
  ): Promise<void> {
    const result = await runStepMode({
      ctx: this.ctx,
      getStepResult: this.getStepResult,
      durableStep: (func) => DBOS.runStep(func, config),
    });

    const key = `${mode}:${config.name}` as keyof InferStepBag<S>;
    this.bag = {
      ...this.bag,
      [key]: result,
    };
  }

  private async iterateCompensateSteps() {
    for (const stepName of [...this.executedSteps].reverse()) {
      const step = this.steps.find((s) => s.execute?.name === stepName);
      if (step) {
        try {
          const config = step.config?.compensate;
          const runStepMode = step.compensate;

          if (runStepMode && config?.name) {
            await this.runStepMode(runStepMode, config, "compensate");
          }
        } catch (error) {
          logger.error(
            `Failed to compensate step '${stepName}':`,
            error as Error,
          );
        }
      }
    }
  }

  private async iterateSagaSteps(): Promise<Bag> {
    for (const step of this.steps) {
      try {
        const config = step.config?.execute;
        const runStepMode = step.execute;

        if (runStepMode && config?.name) {
          await this.runStepMode(runStepMode, config, "execute");
          this.executedSteps.push(config.name);
        }
      } catch (error) {
        await this.iterateCompensateSteps();
        throw error;
      }
    }
    return this.bag as Bag;
  }

  // Método addStep que acumula tipos
  addStep<Step extends ISagaStep<Context, any>>(
    step: Step,
  ): SagaOrchestrator<Context, Bag & InferStepBag<Step>> {
    this.steps.push(step);
    return this as any;
  }

  async start(): Promise<Bag> {
    if (!this.dbosConfig) {
      return this.iterateSagaSteps();
    }
    if (this.dbosConfig.workflowName) {
      const registeredSagaSteps = DBOS.registerWorkflow(
        () => this.iterateSagaSteps(),
        {
          name: this.dbosConfig?.workflowName,
        },
      );
      const handle = await DBOS.startWorkflow(registeredSagaSteps, {
        ...this.dbosConfig?.args,
      })();

      return await handle?.getResult();
    }
    throw new Error("Workflow name is required");
  }

  getBag(): Bag {
    return this.bag as Bag;
  }
}

// Helper types para uso en los steps
export type StepReturnType<T> = T;
export type StepBag<
  ExecuteKey extends string,
  ExecuteType,
  CompensateKey extends string = never,
  CompensateType = never,
> = (ExecuteKey extends string
  ? { [K in `execute:${ExecuteKey}`]: ExecuteType }
  : {}) &
  (CompensateKey extends string
    ? { [K in `compensate:${CompensateKey}`]: CompensateType }
    : {});
