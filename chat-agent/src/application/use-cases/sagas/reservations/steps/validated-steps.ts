import {
  ReservationMode,
  systemMessages,
} from "@/domain/restaurant/reservations/prompts";
import {
  CustomerActionKey,
  CustomerActions,
  ReservationState,
  ReservationStatuses,
} from "@/domain/restaurant/reservations";
import { cacheAdapter } from "@/infraestructure/adapters";
import { logger } from "@/infraestructure/logging";
import { cmsClient } from "@/infraestructure/http/cms";
import { resolveNextState } from "@/application/patterns";
import { humanizerAgent } from "@/application/agents/restaurant";
import {
  ISagaStep,
  SagaBag,
  SagaResult,
  stepConfig,
} from "@/application/patterns";
import { RestaurantCtx } from "@/domain/restaurant";
import { ReservationSchema } from "@/domain/restaurant/reservations/schemas";
import type {
  Appointment,
  CreateAppointment,
  Customer,
} from "@/infraestructure/http/cms";
import { toUTC } from "@/domain/utilities";

export const ATTEMPTS = 4;

export interface ValidateSagaResult extends SagaBag {
  data?: ReservationSchema;
  reservation?: Appointment;
}

export type ValidateSagaSteps =
  | CustomerActionKey
  | "CONFIRM:FAILED"
  | "CONFIRM:SEND_MESSAGE";

export type ValidateFuncSagaResult = (
  ctx: RestaurantCtx,
) => Promise<SagaResult<ValidateSagaResult, ValidateSagaSteps>>;

type ValidateFuncSagaStep = ISagaStep<
  RestaurantCtx,
  ValidateSagaResult,
  ValidateSagaSteps
>;

const makeConfirmed = (): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM", ...stepConfig },
    compensate: { name: "CONFIRM:FAILED", ...stepConfig },
  },
  execute: async ({ ctx }) => {
    const {
      customerMessage,
      RESERVATION_STATE,
      customer,
      business,
      customerPhone,
    } = ctx;

    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_STATE as ReservationState;

    if (!RESERVATION_STATE) {
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
          await cmsClient.createCostumer({
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
      } satisfies CreateAppointment;

      const reservation = (
        (await (await cmsClient.createAppointment(payload)).json()) as {
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
      await cmsClient.deleteAppointment(reservation?.id!);
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
    const { customerMessage, RESERVATION_STATE, customer, business } = ctx;
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_STATE as ReservationState;

    if (!RESERVATION_STATE)
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
    if (customer?.id && RESERVATION_STATE?.id) {
      const timezone = business.general.timezone;
      const { start, end } = datetime;
      const startDateTime = toUTC(start, timezone);
      const endDateTime = toUTC(end, timezone);

      const reservation = (
        (await (
          await cmsClient.updateAppointment(RESERVATION_STATE?.id!, {
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

const sendConfirmationMsg = (mode: ReservationMode): ValidateFuncSagaStep => ({
  config: {
    execute: { name: "CONFIRM:SEND_MESSAGE", ...stepConfig },
  },
  execute: async ({ ctx, getStepResult }) => {
    const {
      customerMessage,
      RESERVATION_STATE,
      reservationKey,
      customer,
      business,
    } = ctx;
    const {
      customerName = "",
      datetime,
      numberOfPeople = 1,
    } = RESERVATION_STATE as ReservationState;
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
      RESERVATION_STATE,
      customer,
    } = ctx;
    const reservation = RESERVATION_STATE as ReservationState;

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
    const { RESERVATION_STATE, customerMessage, reservationKey, customer } =
      ctx;

    if (!RESERVATION_STATE?.id) {
      return {
        continue: true,
      };
    }
    if (RESERVATION_STATE.status !== ReservationStatuses.CANCEL_STARTED) {
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
    const res = await cmsClient.updateAppointment(RESERVATION_STATE.id!, {
      status: "cancelled",
    });
    if (res.status !== 200) {
      throw new Error("Error al cancelar la reserva");
    }
    const assistantResponse = `Hemos cancelado tu reserva  ${RESERVATION_STATE.id} exitosamente ✅. Gracias por preferirnos`;
    await cacheAdapter.delete(reservationKey);
    logger.info(`Reservation ${RESERVATION_STATE.id} cancelled successfully`);
    const result = await humanizerAgent(assistantResponse);
    return { continue: false, result };
  },
  compensate: async ({ ctx }) => {
    const reservationKey = ctx.reservationKey;
    const reservation = ctx.RESERVATION_STATE;
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
