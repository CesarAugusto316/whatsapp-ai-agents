export function formatSagaOutput(
  msg: string,
  description?: string,
  internal?: any,
) {
  return {
    bag: {},
    lastStepResult: {
      execute: {
        result: msg,
        metadata: {
          description,
          internal,
        },
      },
    },
  };
}
