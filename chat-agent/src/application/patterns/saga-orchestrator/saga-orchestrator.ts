import { StepConfig } from "@dbos-inc/dbos-sdk";
import { StartWorkflowParams } from "node_modules/@dbos-inc/dbos-sdk/dist/src/dbos";
import { retryConfig, FuncRetryStep, retryStep } from "./retry-step.strategy";
import { logger } from "@/infraestructure/logging/logger";
import durableExecAdapter from "@/infraestructure/durable-execution/durable.adapter";

/**
 * Defines the two modes a saga step can operate in:
 * - execute: The forward execution of a step
 * - compensate: The compensation/rollback of a step
 */
export type SagaMode = "execute" | "compensate";

/**
 * Generic type representing the saga bag - a record storing results of saga steps.
 * Keys are strings, values can be any type.
 */
export type SagaBag = Record<string, unknown>;

/**
 * Interface for a function that retrieves the result of a specific saga step.
 * @template T The type of the result stored in the bag
 * @template K The type of the step key (string, number, or bigint)
 */
interface SagaStepResult<T, K> {
  (mode: SagaMode, stepKey: K): T | undefined;
}

/**
 * Interface for a durable step function that wraps asynchronous operations.
 * This ensures operations are recorded in the workflow history for recovery.
 */
interface FuncDurableStep {
  <R>(func: () => Promise<R>): Promise<R>;
}

/**
 * Interface for a saga step function that will be executed or compensated.
 * @template C The context type passed to the saga
 * @template B The result type for this step (part of the saga bag)
 * @template K The key type for this step
 */
export interface FuncSagaStep<C, B, K> {
  (
    {
      ctx,
      getStepResult,
      durableStep,
    }: {
      ctx: C; // The immutable context for this saga
      getStepResult: SagaStepResult<B, K>; // Function to retrieve results of previous steps
      durableStep: FuncDurableStep; // Function to wrap operations for durability
      retryStep: FuncRetryStep;
    }, //
  ): Promise<B>; // Returns the result of this step (will be stored in the saga bag)
}

/**
 * Interface representing a complete saga step with execution, compensation, and configuration.
 * @template C The context type
 * @template B The result type for this step
 * @template Key The key type for this step
 */
export interface ISagaStep<C, B, Key> {
  execute: FuncSagaStep<C, B, Key>; // Function to execute the step
  compensate?: FuncSagaStep<C, B, Key>; // Optional function to compensate/rollback the step
  config: Partial<Record<SagaMode, StepConfig & { name: Key }>>; // Configuration for execute/compensate modes
}

/**
 * Main orchestrator class for managing saga workflows with compensation support.
 * Implements the Saga pattern where each step has a corresponding compensation action.
 * @template Context The type of context object passed to saga steps
 * @template T The type of the saga bag (extends SagaBag)
 * @template Key The type of step keys (string | number | bigint)
 */
export class SagaOrchestrator<
  Context,
  T extends SagaBag,
  Key extends string | number | bigint,
> {
  // Immutable context for all saga steps
  private readonly ctx: Readonly<Context>;
  // Collection of saga steps in execution order
  private steps: ISagaStep<Context, T, Key>[] = [];
  // Storage for step results, keyed by mode and step name
  private bag = {} as Record<`${SagaMode}:${Key}`, T>;
  // Tracks successfully executed steps for compensation purposes
  private executedSteps: string[] = [];
  // Optional DBOS workflow configuration
  private readonly dbosConfig?: {
    workflowName?: string; // Name for DBOS workflow registration
    args?: StartWorkflowParams; // Additional workflow start parameters
  };

  /**
   * Constructs a new SagaOrchestrator.
   * @param params Configuration object containing:
   *   - ctx: The context object (will be cloned and frozen for immutability)
   *   - steps: Optional initial saga steps
   *   - dbosConfig: Optional DBOS workflow configuration
   */
  constructor({
    ctx,
    dbosConfig,
  }: {
    ctx: Context;
    dbosConfig?: {
      workflowName?: string;
      args?: StartWorkflowParams;
    };
  }) {
    // Create deep clone of context and freeze to prevent mutations
    this.ctx = Object.freeze(structuredClone(ctx)) satisfies Readonly<Context>;
    this.dbosConfig = Object.freeze(structuredClone(dbosConfig));
  }

  /**
   * Retrieves the result of a specific step from the saga bag.
   * @param mode The mode to retrieve (execute or compensate) - defaults to "execute"
   * @param stepKey The key of the step to retrieve
   * @returns The stored result or undefined if not found
   */
  private getStepResult = (mode: SagaMode = "execute", stepKey: Key) => {
    return this.bag[`${mode}:${stepKey}`];
  };

  /**
   * Executes a single step mode (either execute or compensate).
   * @param runStepMode The function to execute (step's execute or compensate method)
   * @param config Configuration for this step execution
   * @returns Promise that resolves when the step completes
   */
  private async runStepMode(
    runStepMode: FuncSagaStep<Context, T, Key>,
    config: StepConfig & { name: Key },
  ): Promise<void> {
    // Execute the step function with context, result retrieval, and durable step wrapper
    const result = await runStepMode({
      ctx: this.ctx,
      getStepResult: this.getStepResult.bind(this),
      durableStep: (func) => durableExecAdapter.runStep(func, config), // Wrap with DBOS for durability
      retryStep: (func, config = retryConfig) => retryStep(func, config),
    });

    // Store the result in the saga bag using the function name and step name as key
    this.bag = {
      ...this.bag,
      [`${runStepMode.name}:${config.name}`]: result,
    };
  }

  /**
   * Iterates through and compensates all successfully executed steps in reverse order.
   * This implements the compensation flow of the Saga pattern.
   */
  private async iterateCompensateSteps() {
    // Iterate through executed steps in reverse order (LIFO for compensation)
    for (const stepName of [...this.executedSteps].reverse()) {
      // Find the step by its execute configuration name
      const step = this.steps.find((s) => s.config.execute?.name === stepName);
      if (step) {
        try {
          const config = step.config?.compensate;
          const runStepMode = step.compensate; // The compensation function

          // Only compensate if both function and configuration exist
          if (runStepMode && config?.name) {
            await this.runStepMode(runStepMode, config);
          }
        } catch (error) {
          // Log compensation failure but continue compensating other steps
          logger.error(
            `Failed to compensate step '${stepName}':`,
            error as Error,
          );
          // Optionally store the error in the bag for later inspection
          // this.bag[`_${stepName}_compensation_failed`] = error;
          // Decision point: continue compensation or throw to stop
          // throw error; // Uncomment to stop compensation on failure
        }
      }
    }
  }

  /**
   * Iterates through all saga steps in order, executing them.
   * If any step fails, triggers compensation for all previously executed steps.
   * @returns The saga bag containing all step results
   */
  private async iterateSagaSteps() {
    for (const step of this.steps) {
      try {
        const config = step.config?.execute;
        const runStepMode = step.execute; // The execution function

        // Only execute if both function and configuration exist
        if (runStepMode && config?.name) {
          await this.runStepMode(runStepMode, config);
          // Record successfully executed step for potential compensation
          this.executedSteps.push(config.name);
        }
      } catch (error) {
        // Step failed - compensate all previously executed steps
        await this.iterateCompensateSteps();
        logger.error(`Step Error`, error as Error);
        /**
         * Note: We return the bag instead of throwing the error.
         * This is because uncaught exceptions in DBOS workflows don't allow recovery.
         * @see https://docs.dbos.dev/typescript/tutorials/workflow-tutorial#workflow-guarantees
         *
         * The workflow stops execution on error, but all compensation steps
         * are invoked successfully before returning the current state.
         */
        return this.bag;
      }
    }
    // All steps executed successfully
    return this.bag;
  }

  /**
   * Adds a step to the saga orchestrator.
   * Supports method chaining.
   * @param step The saga step to add
   * @returns The orchestrator instance for chaining
   */
  addStep(step: ISagaStep<Context, T, Key>) {
    this.steps.push(step);
    return this;
  }

  /**
   * Starts the saga execution.
   * If DBOS configuration is provided, registers and starts as a DBOS workflow.
   * Otherwise, runs the saga steps directly.
   * @returns Promise resolving to the saga bag with all results
   */
  async start() {
    // Run without DBOS workflow if no DBOS configuration provided
    if (!this.dbosConfig) {
      return this.iterateSagaSteps();
    }

    // Register and start as DBOS workflow if workflow name is provided
    if (this.dbosConfig.workflowName) {
      const registeredSagaSteps = await durableExecAdapter.registerWorkflow(
        () => this.iterateSagaSteps(),
        {
          name: this.dbosConfig?.workflowName,
        },
      );

      const handle = await durableExecAdapter.startWorkflow(
        registeredSagaSteps,
        {
          ...this.dbosConfig?.args,
        },
      );

      return handle()?.getResult();
    }

    throw new Error("Workflow name is required for Workflow definition");
  }

  /**
   * Gets the current saga bag containing all step results.
   * @returns The saga bag
   */
  getBag() {
    return this.bag;
  }
}
