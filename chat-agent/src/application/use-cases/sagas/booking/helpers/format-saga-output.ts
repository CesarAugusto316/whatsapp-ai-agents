export function formatSagaOutput(
  msg: string,
  description?: string,
  internal?: string,
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
