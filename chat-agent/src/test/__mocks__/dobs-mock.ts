// Mock de DBOS para testing
export const DBOS = {
  runStep: async <T>(func: () => Promise<T>, config?: any): Promise<T> => {
    // Simulamos la ejecución del paso con posibles configuraciones
    console.log(
      `DBOS.runStep called with config: ${config?.name || "no-name"}`,
    );
    return await func();
  },

  registerWorkflow: (workflow: any, config?: any) => {
    return async () => {
      return await workflow();
    };
  },
};
