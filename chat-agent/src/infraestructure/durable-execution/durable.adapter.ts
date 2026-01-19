import {
  DBOS,
  StepConfig,
  WorkflowConfig,
  WorkflowHandle,
} from "@dbos-inc/dbos-sdk";
import { StartWorkflowParams } from "node_modules/@dbos-inc/dbos-sdk/dist/src/dbos";

export interface DurableFunc<T> {
  (): Promise<T>;
}

export interface DurableFuncStart<T> {
  (): T;
}

export class DurableExecutionAdapter {
  async runStep<T>(func: DurableFunc<T>, config?: StepConfig) {
    return DBOS.runStep(() => func(), config);
  }

  async registerWorkflow<T>(func: DurableFunc<T>, config?: WorkflowConfig) {
    return DBOS.registerWorkflow(() => func(), config);
  }

  async startWorkflow<T>(
    func: DurableFuncStart<T>,
    params?: StartWorkflowParams,
  ) {
    return DBOS.startWorkflow(func, params) as Promise<() => WorkflowHandle<T>>;
  }
}

export const durableExecution = new DurableExecutionAdapter();
