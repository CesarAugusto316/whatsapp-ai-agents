import { jest } from "bun:test";

// ---- Mock DBOS -------------------------------------------------------------
export const mockDBOS = () => ({
  DBOS: {
    registerWorkflow: jest.fn((fn) => {
      // fn es el workflow
      return (...args: unknown[]) => fn(...args);
    }),
    runStep: jest.fn(async (fn) => fn()),
    workflowID: "mock-workflow",
    setEvent: jest.fn(),
    recv: jest.fn(),
    startWorkflow: jest.fn(),
  },
});
