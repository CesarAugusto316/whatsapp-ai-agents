import { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";

export function formatSagaOutput(
  msg: string,
  description?: string,
  internal?: any,
): BookingSagaResult {
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
