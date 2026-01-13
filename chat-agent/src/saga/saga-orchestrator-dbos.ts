import { logger } from "@/middlewares/logger-middleware";
import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";
import { StartWorkflowParams } from "node_modules/@dbos-inc/dbos-sdk/dist/src/dbos";

export type SagaMode = "execute" | "compensate";

export type SagaBag = Record<string, unknown>;

interface SagaStepResult<T, K> {
  (mode: SagaMode, stepKey: K): T | undefined;
}

interface DurableStep {
  <R>(func: () => Promise<R>): Promise<R>;
}

export interface FuncSagaStep<C, B, K> {
  (
    {
      ctx,
      getStepResult,
      durableStep,
    }: {
      ctx: C;
      getStepResult: SagaStepResult<B, K>;
      durableStep: DurableStep;
    }, //
  ): Promise<B>;
}

/**
 *
 * @description SagaStep
 */
export interface ISagaStep<C, B, Key> {
  execute: FuncSagaStep<C, B, Key>;
  compensate?: FuncSagaStep<C, B, Key>;
  config: Partial<Record<SagaMode, StepConfig & { name: Key }>>;
}

/**
 *
 * @description SagaOrchestrator
 */
export class SagaOrchestrator<
  Context,
  T extends SagaBag,
  Key extends string | number | bigint,
> {
  private readonly ctx: Readonly<Context>;
  private steps: ISagaStep<Context, T, Key>[] = [];
  private bag = {} as Record<`${SagaMode}:${Key}`, T>;
  private executedSteps: string[] = [];
  private readonly dbosConfig?: {
    workflowName?: string;
    args?: StartWorkflowParams;
  };

  constructor({
    ctx,
    dbosConfig,
  }: {
    ctx: Context;
    steps?: ISagaStep<Context, T, Key>[];
    dbosConfig?: {
      workflowName?: string;
      args?: StartWorkflowParams;
    };
  }) {
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Context>;
    this.dbosConfig = Object.freeze(structuredClone(dbosConfig));
  }

  private getStepResult = (mode: SagaMode = "execute", stepKey: Key) => {
    return this.bag[`${mode}:${stepKey}`];
  };

  private async runStepMode(
    runStepMode: FuncSagaStep<Context, T, Key>,
    config: StepConfig & { name: Key },
  ): Promise<void> {
    //
    const result = await runStepMode({
      ctx: this.ctx,
      getStepResult: this.getStepResult.bind(this),
      durableStep: (func) => DBOS.runStep(func, config),
    });

    // Actualizar el bag con el resultado
    this.bag = {
      ...this.bag,
      [`${runStepMode.name}:${config.name}`]: result,
      //
    };
  }

  /**
   *
   * Compensa solo los pasos que se ejecutaron exitosamente
   */
  private async iterateCompensateSteps() {
    // Compensar en orden inverso solo los pasos ejecutados
    for (const stepName of [...this.executedSteps].reverse()) {
      const step = this.steps.find((s) => s.config.execute?.name === stepName);
      if (step) {
        try {
          const config = step.config?.compensate;
          const runStepMode = step.compensate; // STEP FUNCTION

          if (runStepMode && config?.name) {
            await this.runStepMode(runStepMode, config);
          }
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

  private async iterateSagaSteps() {
    for (const step of this.steps) {
      try {
        const config = step.config?.execute;
        const runStepMode = step.execute; // STEP FUNCTION

        if (runStepMode && config?.name) {
          await this.runStepMode(runStepMode, config);
          this.executedSteps.push(config.name); // Registrar paso ejecutado exitosamente
        }
      } catch (error) {
        await this.iterateCompensateSteps();
        /**
         *
         * @description throw error DELETED not caught exceptions does not recover the workflow
         * @link https://docs.dbos.dev/typescript/tutorials/workflow-tutorial#workflow-guarantees
         */
        // stops execution if there is an error and all compensation
        // steps were invoked successfully
        return this.bag;
      }
    }
    return this.bag;
  }

  addStep(step: ISagaStep<Context, T, Key>) {
    this.steps.push(step);
    return this;
  }

  async start() {
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

      return handle?.getResult();
    }
    throw new Error("Workflow name is required");
  }

  getBag() {
    return this.bag;
  }
}
