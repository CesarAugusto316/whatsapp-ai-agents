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

type DurableStep = <T>(func: () => Promise<T>) => Promise<T>;

export interface SagaStep<C, B extends Bag> {
  execute(ctx: C, bag: B, dt: DurableStep): Promise<Partial<B>>; // Cambiado a Partial<B>
  compensate?: (ctx: C, bag: B, dt: DurableStep) => Promise<Partial<B>>; // Cambiado a Partial<B>
  name: string;
  config?: {
    execute?: Retry;
    compensate?: Retry;
  };
}

export class SagaOrchestrator<Ctx, B extends Bag> {
  private steps: SagaStep<Ctx, B>[] = [];
  private bag = {} as B;
  private durableStep = DBOS.runStep;
  private readonly ctx: Readonly<Ctx>;
  private executedSteps: string[] = []; // Para rastrear qué pasos se ejecutaron

  constructor(ctx: Ctx, steps?: SagaStep<Ctx, B>[]) {
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Ctx>;
    this.steps = steps ?? [];
  }

  addStep(step: SagaStep<Ctx, B>) {
    this.steps.push(step);
    return this;
  }

  private async registerSteps() {
    for (const step of this.steps) {
      const stepName = step.name;
      // Registrar paso ejecutado
      this.executedSteps.push(stepName);
      try {
        const config = step.config?.execute
          ? ({
              name: `execute:${stepName}`,
              ...step.config?.execute,
            } satisfies StepConfig)
          : ({
              name: `execute:${stepName}`,
            } satisfies StepConfig);

        const result = await step.execute(this.ctx, this.bag, (call) =>
          this.durableStep(call, config),
        );

        // Actualizar el bag con el resultado
        this.bag = {
          ...this.bag,
          [`execute:${stepName}`]: result, // Guardar resultado completo
        } as B;
      } catch (error) {
        await this.compensate();
        throw error;
      }
    }
    return this.bag; // Retornar el estado final
  }

  execute(name: string) {
    const run = DBOS.registerWorkflow(this.registerSteps, { name });
    return run();
  }

  /**
   *
   * @description executes compensate functions in reverse order
   * Solo compensa los pasos que se ejecutaron exitosamente
   */
  private async compensate() {
    // Solo compensar pasos que se ejecutaron
    const stepsToCompensate = this.executedSteps
      .map((name) => this.steps.find((s) => s.name === name))
      .filter(Boolean)
      .toReversed() as SagaStep<Ctx, B>[];

    for (const step of stepsToCompensate) {
      try {
        if (step.compensate) {
          const stepName = step.name;
          const config = step.config?.compensate
            ? ({
                name: `compensate:${stepName}`,
                ...step.config?.compensate,
              } satisfies StepConfig)
            : ({
                name: `compensate:${stepName}`,
              } satisfies StepConfig);

          const result = await step.compensate(this.ctx, this.bag, (call) =>
            this.durableStep(call, config),
          );

          // Actualizar bag con resultado de compensación
          if (result) {
            this.bag = {
              ...this.bag,
              [`compensate:${stepName}`]: true,
            } as B;
          }
        }
      } catch (error) {
        throw error;
      }
    }
  }
}
