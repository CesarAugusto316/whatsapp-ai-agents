import type { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import type { SendImagePayload } from "@/infraestructure/adapters/whatsapp";

export function formatSagaOutput(
  msg: string,
  description?: string,
  internal?: any,
  images?: SendImagePayload["file"][],
): BookingSagaResult {
  return {
    bag: {},
    lastStepResult: {
      execute: {
        result: msg,
        images,
        metadata: {
          description,
          internal,
        },
      },
    },
  };
}
