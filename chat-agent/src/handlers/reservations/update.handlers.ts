import { FlowHandler } from "../handlers.types";
import z, { safeParse } from "zod";
import { reservationSchema } from "@/ai-agents/schemas";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationInput,
  ReservationState,
  reservationStatuses,
  InputIntent,
} from "@/ai-agents/agent.types";
import { parserPrompts, systemMessages } from "@/ai-agents/tools/prompts";
import { Appointment } from "@/types/business/cms-types";
import { ModelMessage } from "ai";
import {
  aiClient,
  humanizerAgent,
  inputIntentClassifier,
} from "@/ai-agents/agent.config";
import { extractMissingFields, toConversationalFields } from "./make.handlers";

export const updatePreStart: FlowHandler = async (ctx) => {
  const { RESERVATION_CACHE, customerMessage, reservationKey, customer } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }
  // START
  if (!RESERVATION_CACHE?.id) {
    const { success, data } = safeParse(z.uuidv4(), customerMessage.trim());
    if (!success) {
      return humanizerAgent(
        "Por favor, ingresa un ID de reserva válido, sólo dame tu ID, sin texto extra",
      );
    }
    const res = await businessService.getAppointmentById(data);

    console.log({ res });
    if (res.status !== 200) {
      return humanizerAgent(
        "Reserva no encontrada. Seguro que escribiste  el ID correcto?",
      );
    }

    const reservation = (await res.json()) as Appointment;

    // 2. ✅ INPUT DATA VALIDATED
    const responseMsg = `Escribe la palabra ${CustomerActions.UPDATE} para actualizar la reserva. o ${CustomerActions.CANCEL} para cancelarla.`;
    await reservationCacheService.save(reservationKey, {
      ...RESERVATION_CACHE,
      id: reservation.id,
    });
    return humanizerAgent(responseMsg);
  }

  // 1. MODIFY RESERVATION
  if (
    customerMessage?.toUpperCase() === CustomerActions.UPDATE &&
    RESERVATION_CACHE?.id
  ) {
    const responseMsg = systemMessages.getStartMsg(
      {
        userName: customer?.name,
      },
      "update",
    );
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      status: reservationStatuses.UPDATE_STARTED,
    });
    return humanizerAgent(responseMsg);
  }

  // 2. CANCEL RESERVATION
  if (
    customerMessage?.toUpperCase() === CustomerActions.CANCEL &&
    RESERVATION_CACHE?.id
  ) {
    const responseMsg = `Seguro que desea salir del proceso. Escribe ${CustomerActions.YES} para confirmar o ${CustomerActions.NO} para cancelar`;
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      status: reservationStatuses.CANCEL_STARTED,
    });
    return humanizerAgent(responseMsg);
  }
};

export const updateStarted: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  const DATA_PARSER_PROMPT = parserPrompts.dataParser(business);
  const DATA_COLLECTOR_PROMPT = parserPrompts.collector(business);

  try {
    // OPTION: 1. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationCacheService.delete(reservationKey ?? "");
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }

    const inputIntent = await inputIntentClassifier(customerMessage);
    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      return InputIntent.CUSTOMER_QUESTION;
      // This breaks the flow and the fallback AGENT takes control
      // (this time and returns control back)
    }
    if (RESERVATION_CACHE?.id) {
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: `
            This is the reservation's current context.
            MUST BE USED to COMPLETE THE next user message:
              ${JSON.stringify({
                customerName: RESERVATION_CACHE?.customerName ?? "",
                startDateTime: RESERVATION_CACHE?.startDateTime ?? "",
                endDateTime: RESERVATION_CACHE?.endDateTime ?? "",
                day: RESERVATION_CACHE?.day ?? "",
                numberOfPeople: RESERVATION_CACHE?.numberOfPeople ?? 1,
              } satisfies ReservationInput)}
          `,
        },
        { role: "user", content: customerMessage },
      ];

      const aiValidator = await aiClient(messages, DATA_PARSER_PROMPT);
      const { success, data, error } = safeParse(
        reservationSchema,
        aiValidator,
      );
      if (!success) {
        const conversationalContext = {
          missingFields: toConversationalFields(extractMissingFields(error)),
          lastError:
            JSON.parse(aiValidator)?.["error"] ||
            "Algunos datos de la reserva no quedaron claros",
        };
        const aiHumanizer = await aiClient(
          [
            {
              role: "user",
              content: `
                Context for clarification:
                missingFields: ${JSON.stringify(conversationalContext.missingFields)}
                error: ${conversationalContext.lastError}
              `,
            },
          ],
          DATA_COLLECTOR_PROMPT,
        );
        return aiHumanizer;
      }

      const isAvailable = await businessService.checkAvailability({
        "where[day][equals]": data.day ?? "",
        "where[startDateTime][equals]": data.startDateTime ?? "",
        "where[endDateTime][equals]": data.endDateTime ?? "",
      });
      if (!isAvailable) {
        return humanizerAgent(
          "Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.",
        );
      }

      // 2. ✅ INPUT DATA VALIDATED
      await reservationCacheService.save(reservationKey, {
        ...RESERVATION_CACHE,
        customerName: customer?.name,
        day: data.day,
        startDateTime: data?.startDateTime,
        endDateTime: data?.endDateTime,
        numberOfPeople: data.numberOfPeople,
        status: reservationStatuses.UPDATE_VALIDATED,
      });
      const responseMsg = systemMessages.getConfirmationMsg(
        {
          ...data,
          customerName: customer?.name,
        } as ReservationInput,
        "update",
      );

      return humanizerAgent(responseMsg);
    }
  } catch (error) {
    //
  }
};

export const updateValidated: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    customerMessage,
    reservationKey,
    customer,
    business,
  } = ctx;

  if (!customer) {
    return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
  }

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      day = "",
      startDateTime = "",
      endDateTime = "",
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;

    // finally, we create the reservation
    if (customer?.id && business?.id && RESERVATION_CACHE?.id) {
      const res = await businessService.updateAppointment(
        RESERVATION_CACHE?.id,
        {
          business: business?.id,
          customer: customer?.id,
          startDateTime,
          endDateTime,
          numberOfPeople,
          customerName: customer.name ?? "",
          day,
          status: "confirmed",
        },
      );
      const reservation = (await res.json()) as { doc: Appointment };
      const responseMsg = systemMessages.getSuccessMsg(reservation?.doc, {
        customerName: customer?.name,
        numberOfPeople,
        restaurantName: business?.name ?? "",
        mode: "update",
      });
      await reservationCacheService.delete(reservationKey ?? "");
      return humanizerAgent(responseMsg);
    }
    return humanizerAgent("Customer not created");
  }

  // FINAL OPTION: 2. SALIR
  if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
    await reservationCacheService.delete(reservationKey ?? "");
    const assistantMsg = systemMessages.getExitMsg();
    return assistantMsg;
  }

  // FINAL OPTION: 3. REINGRESAR DATOS
  if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
    // RESTART
    const assistantResponse = systemMessages.getStartMsg({
      userName: customer?.name,
    });
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name ?? "",
      customerPhone: customer.phoneNumber,
      status: reservationStatuses.UPDATE_STARTED,
    });
    return assistantResponse;
  }

  // FALLBACK
  if (customerMessage) {
    const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
    return humanizerAgent(assistanceMsg);
  }
};
