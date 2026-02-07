import {
  OperationMode,
  systemMessages,
} from "@/domain/restaurant/booking/prompts";
import {
  CustomerActionKey,
  CustomerActions,
  BookingState,
  BookingStatuses,
} from "@/domain/restaurant/booking";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { logger } from "@/infraestructure/logging";
import { cmsAdapter } from "@/infraestructure/adapters/cms";
import { resolveNextState } from "@/application/patterns";
import { humanizerAgent } from "@/application/agents/restaurant";
import {
  ISagaStep,
  SagaBag,
  SagaResult,
  stepConfig,
} from "@/application/patterns";
import { RestaurantProps } from "@/domain/restaurant";
import { BookingSchema } from "@/domain/restaurant/booking/schemas";
import type {
  Appointment,
  CreateAppointment,
  Customer,
} from "@/infraestructure/adapters/cms";
import { toUTC } from "@/domain/utilities";

export const ATTEMPTS = 4;

export interface ValidateSagaResult extends SagaBag {
  data?: BookingSchema;
  reservation?: Appointment;
}

export type ValidateSagaSteps =
  | CustomerActionKey
  | "CONFIRM:FAILED"
  | "CONFIRM:SEND_MESSAGE";

export type ValidateFuncSagaResult = (
  ctx: RestaurantProps,
) => Promise<SagaResult<ValidateSagaResult, ValidateSagaSteps>>;

type ValidateFuncSagaStep = ISagaStep<
  RestaurantProps,
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

    if (customerMessage?.toUpperCase() !== CustomerActions.CONFIRM) {
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
      } satisfies CreateAppointment;

      const reservation = (
        (await (await cmsAdapter.createAppointment(payload)).json()) as {
          doc: Appointment;
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
    const { customerMessage, reservationKey } = ctx;
    const reservation = getStepResult("execute:CONFIRM")?.reservation;

    if (customerMessage?.toUpperCase() !== CustomerActions.CONFIRM) {
      return { continue: true };
    }
    if (reservation && reservation?.id) {
      await cmsAdapter.deleteAppointment(reservation?.id!);
      await cacheAdapter.delete(reservationKey);
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
    if (customerMessage?.toUpperCase() !== CustomerActions.CONFIRM) {
      return { continue: true };
    }
    if (customer?.id && bookingState?.id) {
      const timezone = business.general.timezone;
      const { start, end } = datetime;
      const startDateTime = toUTC(start, timezone);
      const endDateTime = toUTC(end, timezone);

      const reservation = (
        (await (
          await cmsAdapter.updateAppointment(bookingState?.id!, {
            business: business?.id,
            customer: customer?.id,
            startDateTime,
            endDateTime,
            numberOfPeople,
            customerName: customerName || customer?.name || "",
            status: "confirmed",
          })
        ).json()) as { doc: Appointment }
      ).doc;

      return { reservation, continue: true };
    }
    return { continue: true };
  },
  compensate: async ({ ctx }) => {
    const { reservationKey } = ctx;
    try {
      await cacheAdapter.delete(reservationKey ?? "");
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

const sendConfirmationMsg = (mode: OperationMode): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM:SEND_MESSAGE", ...stepConfig },
  },
  execute: async ({ ctx, getStepResult }) => {
    const {
      customerMessage,
      bookingState,
      reservationKey,
      customer,
      business,
    } = ctx;
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = bookingState as BookingState;
    const reservation = getStepResult("execute:CONFIRM")?.reservation;

    if (!reservation?.id) {
      logger.info("Reservation not found", reservation);
      return {
        continue: true,
      };
    }
    if (customerMessage?.toUpperCase() !== CustomerActions.CONFIRM) {
      return { continue: true };
    }
    const assistantMsg = systemMessages.getSuccessMsg(
      {
        id: reservation?.id,
        datetime, // localTime
        customerName: customerName || customer?.name || "",
        numberOfPeople,
      },
      mode,
      business.general.timezone,
    );
    await cacheAdapter.delete(reservationKey);
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.CONFIRM,
      customerMessage,
    });
    const result = await humanizerAgent(assistantMsg);
    return {
      result,
      continue: false,
    };
  },
});

const exit = (): ValidateFuncSagaStep => ({
  config: { execute: { name: "EXIT", ...stepConfig } },
  execute: async ({ ctx }) => {
    const { customerMessage, reservationKey } = ctx;

    if (customerMessage?.toUpperCase() !== CustomerActions.EXIT) {
      return { continue: true };
    }
    await cacheAdapter.delete(reservationKey);
    const assistantMsg = systemMessages.getExitMsg();
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.EXIT,
    });
    return { result: assistantMsg, continue: false };
  },
});

const restart = (): ValidateFuncSagaStep => ({
  config: { execute: { name: "RESTART", ...stepConfig } },
  execute: async ({ ctx }) => {
    //
    const {
      customerMessage,
      reservationKey,
      business,
      bookingState,
      customer,
    } = ctx;
    const reservation = bookingState as BookingState;

    if (customerMessage?.toUpperCase() !== CustomerActions.RESTART) {
      return { continue: true };
    }
    const assistantResponse = systemMessages.getCreateMsg({
      userName: customer?.name,
    });

    const transition = resolveNextState(
      reservation.status,
      CustomerActions.RESTART,
    );
    await cacheAdapter.save(reservationKey ?? "", {
      ...reservation,
      businessId: business?.id,
      customerId: customer?.id,
      status: transition.nextState,
    });
    logger.info("Customer selected an option", {
      customerAction: CustomerActions.RESTART,
    });

    const result = await humanizerAgent(assistantResponse);
    return { result, continue: false };
  },
});

const cancelConfirmed = (): ValidateFuncSagaStep => ({
  config: { execute: { name: "CONFIRM", ...stepConfig } },
  execute: async ({ ctx }) => {
    //
    const { bookingState, customerMessage, reservationKey, customer } = ctx;

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
    if (customerMessage.toUpperCase() !== CustomerActions.CONFIRM) {
      return { continue: true };
    }
    const res = await cmsAdapter.updateAppointment(bookingState.id!, {
      status: "cancelled",
    });
    if (res.status !== 200) {
      throw new Error("Error al cancelar la reserva");
    }
    const assistantResponse = `Hemos cancelado tu reserva  ${bookingState.id} exitosamente ✅. Gracias por preferirnos`;
    await cacheAdapter.delete(reservationKey);
    logger.info(`Reservation ${bookingState.id} cancelled successfully`);
    const result = await humanizerAgent(assistantResponse);
    return { continue: false, result };
  },
  compensate: async ({ ctx }) => {
    const reservationKey = ctx.reservationKey;
    const reservation = ctx.bookingState;
    if (reservation?.id) {
      const result = `No pudimos cancelar tu reserva ${reservation.id} debido a un error interno. Por favor, inténtalo de nuevo más tarde.`;
      await cacheAdapter.delete(reservationKey);
      return { result, continue: true };
    }
    return { continue: false };
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
