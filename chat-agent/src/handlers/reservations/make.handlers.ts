import { buildApiDates } from "@/ai-agents/tools/helpers";
import { FlowHandler } from "../handlers.types";
import z, { safeParse } from "zod";
import { reservationSchemaWithDates } from "@/ai-agents/schemas";
import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import {
  CustomerActions,
  ReservationInput,
  ReservationState,
  reservationStatuses,
  InputIntent,
} from "@/ai-agents/agent.types";
import {
  dataValidationPrompts,
  systemMessages,
} from "@/ai-agents/tools/prompts";
import { Appointment, Customer } from "@/types/business/cms-types";
import {
  aiClient,
  humanizerAgent,
  inputClassIntent,
} from "@/ai-agents/agent.config";
import { ModelMessage } from "ai";

export function extractMissingFields(zodError: z.ZodError): string[] {
  const fields = new Set<string>();

  for (const issue of zodError.issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      fields.add(field);
    }
  }

  return [...fields];
}

const FIELD_MAP: Record<string, string> = {
  customerName: "customerName",
  day: "date",
  startDateTime: "time",
  endDateTime: "time",
  numberOfPeople: "numberOfPeople",
};

export function toConversationalFields(fields: string[]) {
  return [...new Set(fields.map((f) => FIELD_MAP[f]).filter(Boolean))];
}

export const makeStarted: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    reservationKey,
    customer,
  } = ctx;

  try {
    const inputIntent = await inputClassIntent(customerMessage);

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      return InputIntent.CUSTOMER_QUESTION;
      // This breaks the flow and the fallback AGENT takes control
      // (this time and returns control back)
    }
    // OPTION: 1. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationCacheService.delete(reservationKey ?? "");
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }

    if ((RESERVATION_CACHE?.attempts ?? 0) > 4) {
      await reservationCacheService.save(reservationKey ?? "", {
        ...RESERVATION_CACHE,
        customerName: customer?.name ?? "",
        day: "",
        startDateTime: "",
        endDateTime: "",
        numberOfPeople: 0,
        attempts: RESERVATION_CACHE?.attempts || 0,
      } satisfies Partial<ReservationState>);

      return humanizerAgent(
        "Intentemos de nuevo desde cero. ¿Puedes enviarme todos los datos de la reserva en un solo mensaje?",
      );
    }

    const messages: ModelMessage[] = [
      {
        role: "user",
        content: `
        This is the initial context.
        Can be used as reference for completing the next user message:
          ${JSON.stringify({
            customerName: RESERVATION_CACHE?.customerName ?? "",
            startDateTime: RESERVATION_CACHE?.startDateTime ?? "",
            endDateTime: RESERVATION_CACHE?.endDateTime ?? "",
            day: RESERVATION_CACHE?.day ?? "",
            numberOfPeople: RESERVATION_CACHE?.numberOfPeople ?? 0,
          } satisfies ReservationInput)}
      `,
      },
      { role: "user", content: customerMessage },
    ];
    const DATA_PARSER_PROMPT = dataValidationPrompts.dataParser(business);
    const DATA_COLLECTOR_PROMPT = dataValidationPrompts.humanizer(
      business.general.timezone,
    );
    const aiValidator = await aiClient(messages, DATA_PARSER_PROMPT);
    const { success, data, error } = safeParse(
      reservationSchemaWithDates,
      aiValidator,
    );
    if (!success) {
      const obj = JSON.parse(aiValidator);
      await reservationCacheService.save(reservationKey ?? "", {
        ...RESERVATION_CACHE,
        customerName: obj.customerName ?? "",
        day: obj?.day ?? "",
        startDateTime: obj.startDateTime,
        endDateTime: obj.endDateTime,
        numberOfPeople: obj.numberOfPeople,
        attempts: (RESERVATION_CACHE?.attempts || 0) + 1,
      } satisfies Partial<ReservationState>);

      const conversationalContext = {
        missingFields: toConversationalFields(extractMissingFields(error)),
        lastError:
          obj?.["error"] || "Algunos datos de la reserva no quedaron claros",
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
    await reservationCacheService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      customerName: data.customerName ?? "",
      day: data?.day ?? "",
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime,
      numberOfPeople: data.numberOfPeople,
      status: reservationStatuses.MAKE_VALIDATED,
    } satisfies Partial<ReservationState>);

    const responseMsg = systemMessages.getConfirmationMsg({
      customerName: data.customerName ?? "",
      day: data?.day,
      startDateTime: data.startDateTime,
      endDateTime: data.endDateTime ?? "",
      numberOfPeople: data.numberOfPeople,
    } satisfies ReservationInput);

    return humanizerAgent(responseMsg);
  } catch (error) {
    //
    // BORRAR CACHE y REINICIAR
    return "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?";
  }
};

/**
 *
 * @param ctx
 * @returns
 */
export const makeValidated: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    customerPhone,
    customer,
    reservationKey,
  } = ctx;

  // FINAL OPTION: 1. CONFIRMAR
  if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
    const {
      customerName = "",
      day = "",
      startDateTime: startTime = "",
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;
    let newCustomer = customer;

    const {
      day: reservationDay,
      endDateTime,
      startDateTime,
    } = buildApiDates(
      day,
      startTime,
      (business?.schedule?.averageTime ?? 1) * 60,
    ); // use business average reservation time

    if (!customer) {
      newCustomer = (
        (await (
          await businessService.createCostumer({
            business: business?.id ?? "",
            phoneNumber: customerPhone ?? "",
            name: customerName,
          })
        ).json()) as { doc: Customer }
      ).doc;
    }
    // finally, we create the reservation
    if (newCustomer?.id && business?.id) {
      const res = await businessService.createAppointment({
        business: business?.id,
        customer: newCustomer.id,
        startDateTime,
        customerName: newCustomer.name ?? customerName,
        numberOfPeople,
        endDateTime,
        day: reservationDay,
        status: "confirmed",
      });
      const reservation = (await res.json()) as { doc: Appointment };
      const assistantMsg = systemMessages.getSuccessMsg(reservation?.doc, {
        customerName: newCustomer.name ?? customerName,
        numberOfPeople,
        restaurantName: business?.name ?? "",
      });
      await reservationCacheService.delete(reservationKey ?? "");
      return assistantMsg;
    }
    return "Cliente no pudo ser creado";
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
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name ?? "",
      customerPhone,
      status: reservationStatuses.MAKE_STARTED,
    });
    return assistantResponse;
  }

  // FALLBACK
  if (customerMessage) {
    const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
    return assistanceMsg;
  }
};
