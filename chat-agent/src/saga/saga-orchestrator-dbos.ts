import { logger } from "@/middlewares/logger-middleware";
import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";
import { StartWorkflowParams } from "node_modules/@dbos-inc/dbos-sdk/dist/src/dbos";

export type SagaBag = Record<string, unknown>;
export type Retry = Pick<
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

export interface FuncSagaStep<C, B> {
  (
    {
      ctx,
      getStepResult,
      durableStep,
    }: {
      ctx: C;
      getStepResult: SagaStepResult<B>;
      durableStep: DurableStep<B>;
    }, //
  ): Promise<B>;
}

/**
 *
 * @description SagaStep
 */
export interface ISagaStep<C, B> {
  execute: FuncSagaStep<C, B>;
  compensate?: FuncSagaStep<C, B>;
  config: Partial<Record<SagaMode, StepConfig & { name: string }>>;
}

/**
 *
 * @description SagaOrchestrator
 */
export class SagaOrchestrator<Context, T extends SagaBag> {
  private readonly ctx: Readonly<Context>;
  private steps: ISagaStep<Context, T>[] = [];
  private bag = {} as Record<string, T>;
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
    steps?: ISagaStep<Context, T>[];
    dbosConfig?: {
      workflowName?: string;
      args?: StartWorkflowParams;
    };
  }) {
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Context>;
    this.dbosConfig = Object.freeze(structuredClone(dbosConfig));
  }

  private getStepResult = (mode: SagaMode = "execute", stepKey: string) => {
    return this.bag[`${mode}:${stepKey}`];
  };

  private async runStepMode(
    runStepMode: FuncSagaStep<Context, T>,
    config: StepConfig & { name: string },
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
    } satisfies Record<string, T>;
  }

  /**
   *
   * Compensa solo los pasos que se ejecutaron exitosamente
   */
  private async iterateCompensateSteps() {
    // Compensar en orden inverso solo los pasos ejecutados
    for (const stepName of [...this.executedSteps].reverse()) {
      const step = this.steps.find((s) => s.execute?.name === stepName);
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
         * @todo DELETED not caught exceptions does not recover the workflow
         * @link https://docs.dbos.dev/typescript/tutorials/workflow-tutorial#workflow-guarantees
         */
        // throw error;
      }
    }
    return this.bag;
  }

  addStep(step: ISagaStep<Context, T>) {
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
