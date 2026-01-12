import { logger } from "@/middlewares/logger-middleware";
import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";

type Bag = Record<string, unknown>;
type Retry = Pick<
  StepConfig,
  "retriesAllowed" | "maxAttempts" | "intervalSeconds" | "backoffRate"
>;

type SagaMode = "execute" | "compensate";

type GetStepResult = <T = unknown>(
  mode: SagaMode,
  stepKey: string,
) => T | undefined;

type DurableStep = <T>(func: () => Promise<T>) => Promise<T>;

type StepArgs<C, B> = (
  ctx: C,
  getStepResult: GetStepResult,
  durableStep: DurableStep,
) => Promise<Partial<B>>;

interface StepModes<F, M> extends Partial<Record<SagaMode, StepArgs<F, M>>> {
  execute: StepArgs<F, M>;
  compensate?: StepArgs<F, M>;
}

export interface SagaStep<C, B> extends StepModes<C, B> {
  name: string;
  config?: Partial<Record<SagaMode, Retry>>;
}

/**
 *
 * @description
 */
export class SagaOrchestrator<Ctx> {
  private steps: SagaStep<Ctx, Bag>[] = [];
  private bag = {} as Bag;
  private readonly ctx: Readonly<Ctx>;
  private executedSteps: string[] = [];

  constructor(ctx: Ctx, steps?: SagaStep<Ctx, Bag>[]) {
    this.ctx = Object.freeze(structuredClone(ctx));
    this.steps = steps ?? [];
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

  private getStepResult: GetStepResult = <T>(
    mode: SagaMode = "execute",
    stepKey: string,
  ) => {
    return this.bag[`${mode}:${stepKey}`] as T;
  };

  private async runStep(
    mode: SagaMode,
    step: SagaStep<Ctx, Bag>,
  ): Promise<void> {
    const runMode = step[mode];
    if (!runMode) return;

    const stepName = step.name;
    const stepConfig = this.createStepConfig(stepName, mode, step?.config);
    const result = await runMode(this.ctx, this.getStepResult, (func) =>
      DBOS.runStep(func, stepConfig),
    );

    // Actualizar el bag con el resultado
    this.bag = {
      ...this.bag,
      [`${mode}:${stepName}`]: result,
    } as Bag;
  }

  /**
   * Compensa solo los pasos que se ejecutaron exitosamente
   */
  private async compensateExecutedSteps() {
    // Compensar en orden inverso solo los pasos ejecutados
    for (const stepName of [...this.executedSteps].reverse()) {
      const step = this.steps.find((s) => s.name === stepName);
      if (step) {
        try {
          await this.runStep("compensate", step);
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

  private async workflow() {
    for (const step of this.steps) {
      try {
        await this.runStep("execute", step);
        this.executedSteps.push(step.name); // Registrar paso ejecutado exitosamente
      } catch (error) {
        await this.compensateExecutedSteps();
        throw error;
      }
    }
    return this.bag;
  }

  addStep(step: SagaStep<Ctx, Bag>) {
    if (this.steps.some((s) => s.name === step.name)) {
      throw new Error(`Step with name '${step.name}' already exists`);
    }
    this.steps.push(step);
    return this;
  }

  execute<T = Bag>(name: string): Promise<T> {
    const run = DBOS.registerWorkflow(() => this.workflow(), { name });
    return run() as Promise<T>;
  }
}
