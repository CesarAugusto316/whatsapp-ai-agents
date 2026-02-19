import { systemMessages } from "@/domain/booking/prompts";
import {
  CustomerSignal,
  CustomerSignals,
  BookingState,
  BookingStatuses,
} from "@/domain/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { logger } from "@/infraestructure/logging";
import { cmsAdapter } from "@/infraestructure/adapters/cms";
import { humanizerAgent } from "@/application/agents";
import {
  ISagaStep,
  SagaBag,
  SagaResult,
  stepConfig,
} from "@/application/patterns";
import { DomainCtx } from "@/domain/booking";
import type {
  Booking,
  CreateBooking,
  Customer,
} from "@/infraestructure/adapters/cms";
import { toUTC } from "@/domain/utilities";
import { BookingSchema } from "@/domain/booking/input-parser/booking-schemas";
import { bookingStateManager } from "@/application/services/state-managers";
import { OperationMode } from "@/domain";

export const ATTEMPTS = 4;

export interface ValidateSagaResult extends SagaBag {
  data?: BookingSchema;
  reservation?: Booking;
}

export type ValidateSagaSteps =
  | CustomerSignal
  | "CONFIRM:FAILED"
  | "CONFIRM:SEND_MESSAGE";

export type ValidateFuncSagaResult = (
  ctx: DomainCtx,
) => Promise<SagaResult<ValidateSagaResult, ValidateSagaSteps>>;

type ValidateFuncSagaStep = ISagaStep<
  DomainCtx,
  ValidateSagaResult,
  ValidateSagaSteps
>;

const makeConfirmed = (): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM", ...stepConfig },
    compensate: { name: "CONFIRM:FAILED", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const { customerMessage, bookingState, customer, business, customerPhone } =
      ctx;

    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = bookingState as BookingState;

    if (!bookingState) {
      return {
        continue: false,
        result: "Ocurrió un error, vuelve a intearlo mas tarde",
      };
    }

    if (customerMessage?.toUpperCase() !== CustomerSignals.CONFIRM) {
      return { continue: true };
    }
    let newCustomer = customer;
    if (!customer && customerName) {
      newCustomer = (
        (await (
          await cmsAdapter.createCostumer({
            business: business?.id || "",
            phoneNumber: customerPhone || "",
            name: customerName,
          })
        ).json()) as { doc: Customer }
      )?.doc;
    }

    if (newCustomer?.id && business?.id) {
      const timezone = business.general.timezone;
      const startDateTime = toUTC(datetime?.start, timezone);
      const endDateTime = toUTC(datetime?.end, timezone);
      const payload = {
        business: business.id,
        customer: newCustomer?.id!,
        startDateTime,
        endDateTime,
        customerName: newCustomer?.name!,
        numberOfPeople,
        status: "confirmed",
        timezone: business.general.timezone,
      } satisfies CreateBooking;

      const reservation = (
        (await (await cmsAdapter.createBooking(payload)).json()) as {
          doc: Booking;
        }
      ).doc;

      logger.info("✨Reservation created, response", reservation);
      return { reservation, continue: true };
    }
    return {
      continue: false,
      result: "No pudimos crear tu reserva intenlo mas tarde",
    };
  },
  compensate: async ({ ctx, getStepResult }) => {
    const { customerMessage, bookingKey } = ctx;
    const reservation = getStepResult("execute:CONFIRM")?.reservation;

    if (customerMessage?.toUpperCase() !== CustomerSignals.CONFIRM) {
      return { continue: true };
    }
    if (reservation && reservation?.id) {
      await cmsAdapter.deleteBooking(reservation?.id!);
      await cacheAdapter.delete(bookingKey);
      logger.error("Error deleting appointment"); // DBOS reintentará el flujo desde el último checkpoint
    }
    return {
      continue: false,
      result: "Hubo un problema procesando tu reserva. Inténtalo más tarde.",
    };
  },
});

const updateConfirmed = (): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM", ...stepConfig },
    compensate: { name: "CONFIRM:FAILED", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const { customerMessage, bookingState, customer, business } = ctx;
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = bookingState as BookingState;

    if (!bookingState)
      return {
        continue: false,
        result: "Ocurrió un error, vuelve a intearlo mas tarde",
      };
    if (!customer) {
      return {
        result:
          "Aún no te has registrado, por favor has tu primera reserva para registrarte",
        continue: false,
      };
    }
    if (customerMessage?.toUpperCase() !== CustomerSignals.CONFIRM) {
      return { continue: true };
    }
    if (customer?.id && bookingState?.id) {
      const timezone = business.general.timezone;
      const { start, end } = datetime;
      const startDateTime = toUTC(start, timezone);
      const endDateTime = toUTC(end, timezone);

      const reservation = (
        (await (
          await cmsAdapter.updateBooking(bookingState?.id!, {
            business: business?.id,
            customer: customer?.id,
            startDateTime,
            endDateTime,
            numberOfPeople,
            customerName: customerName || customer?.name || "",
            status: "confirmed",
          })
        ).json()) as { doc: Booking }
      ).doc;

      return { reservation, continue: true };
    }
    return { continue: true };
  },
  compensate: async ({ ctx }) => {
    const { bookingKey } = ctx;
    try {
      await cacheAdapter.delete(bookingKey ?? "");
    } catch (cacheError) {
      logger.error(
        "Failed to clean cache after update error",
        cacheError as Error,
      );
    }
    return {
      continue: false,
      result: "Hubo un problema procesando tu reserva. Inténtalo más tarde.",
    };
  },
});

const cancelConfirmed = (): ValidateFuncSagaStep => ({
  config: { execute: { name: "CONFIRM", ...stepConfig } },
  execute: async ({ ctx }) => {
    //
    const { bookingState, customerMessage, bookingKey, customer } = ctx;

    if (!bookingState?.id) {
      return {
        continue: true,
      };
    }
    if (bookingState.status !== BookingStatuses.CANCEL_STARTED) {
      return {
        continue: true,
      };
    }
    if (!customer) {
      return {
        continue: false,
        result:
          "Aún no te has registrado, por favor has tu primera reserva para registrarte",
      };
    }
    if (customerMessage.toUpperCase() !== CustomerSignals.CONFIRM) {
      return { continue: true };
    }
    const res = await cmsAdapter.updateBooking(bookingState.id!, {
      status: "cancelled",
    });
    if (res.status !== 200) {
      throw new Error("Error al cancelar la reserva");
    }
    const assistantResponse = `Hemos cancelado tu reserva  ${bookingState.id} exitosamente ✅. Gracias por preferirnos`;
    await cacheAdapter.delete(bookingKey);
    logger.info(`Reservation ${bookingState.id} cancelled successfully`);
    const result = await humanizerAgent(assistantResponse);
    return { continue: false, result };
  },
  compensate: async ({ ctx }) => {
    const bookingKey = ctx.bookingKey;
    const reservation = ctx.bookingState;
    if (reservation?.id) {
      const result = `No pudimos cancelar tu reserva ${reservation.id} debido a un error interno. Por favor, inténtalo de nuevo más tarde.`;
      await cacheAdapter.delete(bookingKey);
      return { result, continue: true };
    }
    return { continue: false };
  },
});

const sendConfirmationMsg = (mode: OperationMode): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM:SEND_MESSAGE", ...stepConfig },
  },
  execute: async ({ ctx, getStepResult }) => {
    const { customerMessage, bookingState, bookingKey, customer, business } =
      ctx;
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
      status,
    } = bookingState as BookingState;
    const reservation = getStepResult("execute:CONFIRM")?.reservation;

    if (!reservation?.id) {
      logger.info("Reservation not found", reservation);
      return {
        continue: true,
      };
    }
    if (customerMessage?.toUpperCase() !== CustomerSignals.CONFIRM) {
      return { continue: true };
    }
    // const assistantMsg = systemMessages.getSuccessMsg(
    //   {
    //     id: reservation?.id,
    //     datetime, // localTime
    //     customerName: customerName || customer?.name || "",
    //     numberOfPeople,
    //   },
    //   mode,
    //   business.general.timezone,
    // );

    const { message } = bookingStateManager.nextState(status!);

    await cacheAdapter.delete(bookingKey);
    logger.info("Customer selected an option", {
      customerAction: CustomerSignals.CONFIRM,
      customerMessage,
    });
    const result = await humanizerAgent(message);
    return {
      result,
      continue: false,
    };
  },
});

const exit = (): ValidateFuncSagaStep => ({
  config: { execute: { name: "EXIT", ...stepConfig } },
  execute: async ({ ctx }) => {
    const { customerMessage, bookingKey } = ctx;

    if (customerMessage?.toUpperCase() !== CustomerSignals.EXIT) {
      return { continue: true };
    }
    await cacheAdapter.delete(bookingKey);
    const assistantMsg = systemMessages.getExitMsg();
    logger.info("Customer selected an option", {
      customerAction: CustomerSignals.EXIT,
    });
    return { result: assistantMsg, continue: false };
  },
});

const restart = (): ValidateFuncSagaStep => ({
  config: { execute: { name: "RESTART", ...stepConfig } },
  execute: async ({ ctx }) => {
    //
    const { customerMessage, bookingKey, business, bookingState, customer } =
      ctx;
    const reservation = bookingState as BookingState;

    if (customerMessage?.toUpperCase() !== CustomerSignals.RESTART) {
      return { continue: true };
    }
    const assistantResponse = systemMessages.getCreateMsg({
      userName: customer?.name,
    });

    const transition = bookingStateManager.nextState(
      reservation.status + CustomerSignals.RESTART,
    );
    await cacheAdapter.save(bookingKey ?? "", {
      ...reservation,
      businessId: business?.id,
      customerId: customer?.id,
      status: transition.nextState,
    });
    logger.info("Customer selected an option", {
      customerAction: CustomerSignals.RESTART,
    });

    const result = await humanizerAgent(assistantResponse);
    return { result, continue: false };
  },
});

export const validatedSteps = {
  updateConfirmed,
  makeConfirmed,
  cancelConfirmed,
  sendConfirmationMsg,
  exit,
  restart,
};
