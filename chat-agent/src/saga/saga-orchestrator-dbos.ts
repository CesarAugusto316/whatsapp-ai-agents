import { logger } from "@/middlewares/logger-middleware";
import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";

type SagaBag = Record<string, unknown>;
type Retry = Pick<
  StepConfig,
  "retriesAllowed" | "maxAttempts" | "intervalSeconds" | "backoffRate"
>;

type SagaMode = "execute" | "compensate";

interface SagaStepResult<T> {
  (mode: SagaMode, stepKey: string): T | undefined;
}

interface DurableStep<T> {
  (func: () => Promise<T>): Promise<T>;
}

interface FuncSagaStep<C, B> {
  ({
    ctx,
    getStepResult,
    durableStep,
  }: {
    ctx: C;
    getStepResult: SagaStepResult<B>;
    durableStep: DurableStep<B>;
  }): Promise<Partial<B>>;
}

// interface FuncSagaModes<F, M> extends Partial<
//   Record<SagaMode, FuncSagaStep<F, M>>
// > {
//   execute: FuncSagaStep<F, M>;
//   compensate?: FuncSagaStep<F, M>;
// }

/**
 *
 * @description SagaStep
 */
export interface ISagaStep<C, B> {
  execute: (
    ctx: C,
    getStepResult: SagaStepResult<B>,
    durableStep: DurableStep<B>,
  ) => Promise<Partial<B>>;
  compensate?: (
    ctx: C,
    getStepResult: SagaStepResult<B>,
    durableStep: DurableStep<B>,
  ) => Promise<Partial<B>>;
  name: string;
  config?: Partial<Record<SagaMode, Retry>>;
}

export class SagaStep<C, B> implements ISagaStep<C, B> {
  constructor(
    public name: string,
    public execute: (
      ctx: C,
      getStepResult: SagaStepResult<B>,
      durableStep: DurableStep<B>,
    ) => Promise<Partial<B>>,
    public compensate?: (
      ctx: C,
      getStepResult: SagaStepResult<B>,
      durableStep: DurableStep<B>,
    ) => Promise<Partial<B>>,
    public config?: Partial<Record<SagaMode, Retry>>,
  ) {}
}

/**
 *
 * @description SagaOrchestrator
 */
export class SagaOrchestrator<Context> {
  private readonly ctx: Readonly<Context>;
  private steps: ISagaStep<Context, SagaBag>[];
  private bag = {} as SagaBag;
  private executedSteps: string[] = [];

  constructor(ctx: Context, steps: ISagaStep<Context, SagaBag>[] = []) {
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Context>;
    this.steps = steps;
  }

  private createStepConfig(
    stepName: string,
    mode: SagaMode,
    config?: Partial<Record<SagaMode, Retry>>, // this can be opcional, is ok
  ): StepConfig {
    //
    if (!config) {
      return {
        name: `${mode}:${stepName}`,
      }; // Indica que no se usará DBOS.runStep
    }

    return {
      name: `${mode}:${stepName}`,
      ...config[mode],
    };
  }

  private getStepResult = <T>(mode: SagaMode = "execute", stepKey: string) => {
    return this.bag[`${mode}:${stepKey}`] as T;
  };

  private async runStepMode(
    mode: SagaMode,
    step: ISagaStep<Context, SagaBag>,
  ): Promise<void> {
    //
    const runStepMode = step[mode]; // "execute" | "compensate"
    if (!runStepMode) return;

    const stepName = step.name;
    const stepConfig = this.createStepConfig(stepName, mode, step?.config);
    const result = await runStepMode(this.ctx, this.getStepResult, (func) =>
      DBOS.runStep(func, stepConfig),
    );

    // Actualizar el bag con el resultado
    this.bag = {
      ...this.bag,
      [`${mode}:${stepName}`]: result,
    } satisfies SagaBag;
  }

  /**
   *
   * Compensa solo los pasos que se ejecutaron exitosamente
   */
  private async iterateCompensateSteps() {
    // Compensar en orden inverso solo los pasos ejecutados
    for (const stepName of [...this.executedSteps].reverse()) {
      const step = this.steps.find((s) => s.name === stepName);
      if (step) {
        try {
          await this.runStepMode("compensate", step);
        } catch (error) {
          logger.error(
            `Failed to compensate step '${stepName}':`,
            error as Error,
          );
          // Opcional: guardar error en el bag
          // this.bag[`_${stepName}_compensation_failed`] = error;
          // Puedes decidir si continuar o lanzar el error
          // throw error; // Si quieres detener la compensación
        }
      }
    }
  }

  private async iterateSagaSteps<T extends SagaBag>() {
    for (const step of this.steps) {
      try {
        await this.runStepMode("execute", step);
        this.executedSteps.push(step.name); // Registrar paso ejecutado exitosamente
      } catch (error) {
        await this.iterateCompensateSteps();
        throw error;
      }
    }
    return this.bag as T;
  }

  addStep(step: ISagaStep<Context, SagaBag>) {
    if (this.steps.some((s) => s.name === step.name)) {
      throw new Error(`Step with name '${step.name}' already exists`);
    }
    this.steps.push(step);
    return this;
  }

  start<T extends SagaBag>(name?: string): Promise<T> {
    if (!name) {
      return this.iterateSagaSteps<T>();
    }
    const registeredSagaSteps = DBOS.registerWorkflow(
      this.iterateSagaSteps.bind(this),
      {
        name,
      },
    );
    return registeredSagaSteps<T>();
  }

  getBag(): SagaBag {
    return this.bag;
  }
}
