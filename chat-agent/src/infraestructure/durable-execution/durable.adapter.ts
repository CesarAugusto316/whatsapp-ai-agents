import { DBOS, StepConfig, WorkflowConfig } from "@dbos-inc/dbos-sdk";
// import { StartWorkflowParams } from "node_modules/@dbos-inc/dbos-sdk/dist/src/dbos";

export interface DurableStep {
  <T>(): Promise<T>;
}

export interface DurableStart {
  <T>(): T;
}

export class DurableExecutionAdapter {
  async runStep<T>(func: DurableStep, config?: StepConfig) {
    return DBOS.runStep(() => func<T>(), config);
  }

  async registerWorkflow<T>(func: DurableStep, config?: WorkflowConfig) {
    return DBOS.registerWorkflow(() => func<T>(), config);
  }

  // startWorkflow(func: DurableStart, params?: WorkflowConfig) {
  //   return DBOS.startWorkflow(
  //     () => func(),
  //     params,
  //   ) as () => WorkflowHandle<any>;
  // }
}

export default new DurableExecutionAdapter();
