import { jest } from "bun:test";

// ---- Mock DBOS -------------------------------------------------------------
export const mockDBOS = () => ({
  DBOS: {
    registerWorkflow: jest.fn((fn) => {
      // fn es el workflow
      return (...args: unknown[]) => fn(...args);
    }),
    startWorkflow: jest.fn((fn, args) => {
      // fn es el workflow registrado (función que retorna el bag)
      // args son los parámetros de inicio (StartWorkflowParams)
      return () => ({
        getResult: async () => {
          // Ejecutar el workflow y retornar su resultado (bag)
          // Pasamos args aunque fn no los use, para mantener compatibilidad
          const result = await fn(args);
          return result;
        },
      });
    }),
    runStep: jest.fn(async (fn) => fn()),
    workflowID: "mock-workflow",
    setEvent: jest.fn(),
    recv: jest.fn(),
    // startWorkflow: jest.fn(),
  },
});
