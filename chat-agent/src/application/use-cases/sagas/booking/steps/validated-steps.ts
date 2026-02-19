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

const created = (): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM", ...stepConfig },
    compensate: { name: "CONFIRM:FAILED", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const {
      customerMessage,
      bookingState,
      customer,
      business,
      customerPhone,
      bookingKey,
    } = ctx;

    const {
      status,
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

    if (customerMessage.toUpperCase() === CustomerSignals.EXIT) {
      const { message } = bookingStateManager.nextState(
        bookingState?.status + CustomerSignals.EXIT,
      );
      await cacheAdapter.delete(bookingKey);
      logger.info("Customer selected an option", {
        customerAction: CustomerSignals.EXIT,
      });
      return { result: message, continue: false };
    }

    if (customerMessage.toUpperCase() === CustomerSignals.RESTART) {
      const reservation = bookingState as BookingState;
      const transition = bookingStateManager.nextState(
        reservation.status + CustomerSignals.RESTART,
        { userName: customer?.name },
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
      return { result: transition.message, continue: false };
    }

    if (customerMessage.toLocaleUpperCase() !== CustomerSignals.CONFIRM) {
      return {
        continue: false,
      };
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
      const { message } = bookingStateManager.nextState(
        status + CustomerSignals.CONFIRM,
        {
          data: {
            id: reservation?.id,
            datetime, // localTime
            customerName: customerName || customer?.name || "",
            numberOfPeople,
          },
          timeZone: business.general.timezone,
          domain: business.general.businessType,
        },
      );

      await cacheAdapter.delete(bookingKey);
      return { result: message, continue: false };
    }
    await cacheAdapter.delete(bookingKey);
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

const updated = (): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM", ...stepConfig },
    compensate: { name: "CONFIRM:FAILED", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const { customerMessage, bookingState, customer, business, bookingKey } =
      ctx;
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
      status,
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

    if (customerMessage.toUpperCase() === CustomerSignals.EXIT) {
      const { message } = bookingStateManager.nextState(
        bookingState?.status + CustomerSignals.EXIT,
      );
      await cacheAdapter.delete(bookingKey);
      logger.info("Customer selected an option", {
        customerAction: CustomerSignals.EXIT,
      });
      return { result: message, continue: false };
    }

    if (customerMessage.toUpperCase() === CustomerSignals.RESTART) {
      const reservation = bookingState as BookingState;
      const transition = bookingStateManager.nextState(
        reservation.status + CustomerSignals.RESTART,
        { userName: customer?.name },
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
      return { result: transition.message, continue: false };
    }

    if (customerMessage.toLocaleUpperCase() !== CustomerSignals.CONFIRM) {
      return {
        continue: false,
      };
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

      const { message } = bookingStateManager.nextState(
        status + CustomerSignals.CONFIRM,
        {
          data: {
            id: reservation?.id,
            datetime, // localTime
            customerName: customerName || customer?.name || "",
            numberOfPeople,
          },
          timeZone: business.general.timezone,
          domain: business.general.businessType,
        },
      );
      await cacheAdapter.delete(bookingKey!);
      return { result: message, continue: false };
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

const cancelled = (): ValidateFuncSagaStep => ({
  config: { execute: { name: "CONFIRM", ...stepConfig } },
  execute: async ({ ctx }) => {
    //
    const { bookingState, customerMessage, bookingKey, customer } = ctx;

    if (!bookingState?.id) {
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

    if (customerMessage.toUpperCase() === CustomerSignals.EXIT) {
      const { message } = bookingStateManager.nextState(
        bookingState?.status + CustomerSignals.EXIT,
      );
      await cacheAdapter.delete(bookingKey);
      logger.info("Customer selected an option", {
        customerAction: CustomerSignals.EXIT,
      });
      return { result: message, continue: false };
    }

    if (customerMessage.toLocaleUpperCase() !== CustomerSignals.CONFIRM) {
      return {
        continue: false,
      };
    }

    const res = await cmsAdapter.updateBooking(bookingState.id!, {
      status: "cancelled",
    });
    if (res.status !== 200) {
      throw new Error("Error al cancelar la reserva");
    }
    const assistantResponse = `Hemos cancelado tu reserva  ${bookingState.id} exitosamente ✅. Gracias por preferirnos`;
    logger.info(`Reservation ${bookingState.id} cancelled successfully`);

    await cacheAdapter.delete(bookingKey);
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

export const validatedSteps = {
  updated,
  created,
  cancelled,
};
