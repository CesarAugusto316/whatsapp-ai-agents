import type { BookingSagaResult } from "@/application/use-cases/sagas/booking/booking-saga";
import type { MediaFile } from "@/infraestructure/adapters/whatsapp";

export function formatSagaOutput(
  msg: string,
  description?: string,
  internal?: any,
  files?: MediaFile[],
): BookingSagaResult {
  return {
    bag: {},
    lastStepResult: {
      execute: {
        result: msg,
        files: files,
        metadata: {
          description,
          internal,
        },
      },
    },
  };
}
