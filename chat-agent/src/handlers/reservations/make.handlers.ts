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
  FlowOptions,
} from "@/ai-agents/agent.types";
import { parserPrompts, systemMessages } from "@/ai-agents/tools/prompts";
import { Appointment, Customer } from "@/types/business/cms-types";
import {
  aiClient,
  humanizerAgent,
  inputIntentClassifier,
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

export const ATTEMPTS = 4;

export const makeStarted: FlowHandler = async (ctx) => {
  const {
    RESERVATION_CACHE,
    business,
    customerMessage,
    reservationKey,
    customer,
  } = ctx;

  const previousState = {
    customerName: RESERVATION_CACHE?.customerName || customer?.name || "",
    day: RESERVATION_CACHE?.day || "",
    startDateTime: RESERVATION_CACHE?.startDateTime || "",
    endDateTime: RESERVATION_CACHE?.endDateTime,
    numberOfPeople: RESERVATION_CACHE?.numberOfPeople || 0,
    //
  } satisfies ReservationInput;

  const PARSER_PROMPT = parserPrompts.dataParser(business);
  const COLLECTOR_PROMPT = parserPrompts.collector(business);

  try {
    // OPTION: 1. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationCacheService.delete(reservationKey);
      const responseMsg = systemMessages.getExitMsg();
      return humanizerAgent(responseMsg);
    }
    if ((RESERVATION_CACHE?.attempts ?? 0) >= ATTEMPTS) {
      await reservationCacheService.delete(reservationKey);
      return humanizerAgent(`
        Has llegado al límite de intentos fallidos al checkear disponibilidad.
        Empecemos de nuevo desde cero. Escribe "${FlowOptions.MAKE_RESERVATION}"
        para iniciar otro proceso de reserva.
      `);
    }
    const inputIntent = await inputIntentClassifier(customerMessage);

    if (inputIntent === InputIntent.CUSTOMER_QUESTION) {
      return InputIntent.CUSTOMER_QUESTION;
      // This breaks the flow and the fallback AGENT takes control
      // (Just for this time)
    }
    const messages: ModelMessage[] = [
      { role: "user", content: customerMessage },
    ];
    const aiValidator: string = await aiClient(messages, PARSER_PROMPT);
    let rawObj!: Partial<ReservationInput> | undefined;
    try {
      const parsedRaw = safeParse(
        reservationSchema.partial(),
        JSON.parse(aiValidator),
      );
      if (!parsedRaw.success) {
        return humanizerAgent(
          "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
        );
      }
      rawObj = parsedRaw.data;
    } catch {
      return humanizerAgent(
        "Lo siento no pude comprender tus datos, podrias escribirlos de nuevo con mas claridad ?",
      );
    }
    const mergeState = {
      customerName: rawObj?.customerName || previousState.customerName,
      day: rawObj?.day || previousState.day,
      startDateTime: rawObj?.startDateTime || previousState.startDateTime,
      endDateTime: rawObj?.endDateTime || previousState.endDateTime,
      numberOfPeople: rawObj?.numberOfPeople || previousState.numberOfPeople,
      //
    } satisfies ReservationInput;

    console.log({ mergeState, RESERVATION_CACHE, rawObj });
    const { success, data, error } = safeParse(reservationSchema, mergeState); // all fields are required
    if (!success) {
      await reservationCacheService.save(reservationKey, {
        ...RESERVATION_CACHE,
        ...mergeState,
      } satisfies Partial<ReservationState>);

      const conversationalContext = {
        missingFields: toConversationalFields(extractMissingFields(error)),
        lastError:
          error.issues.at(0)?.message ||
          "Algunos datos de la reserva hacen falta",
      };
      const aiDataCollector = aiClient(
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
        COLLECTOR_PROMPT,
      );
      return aiDataCollector;
    }

    const isAvailable = await businessService.checkAvailability({
      "where[day][equals]": data.day ?? "",
      "where[startDateTime][equals]": data.startDateTime ?? "",
      "where[endDateTime][equals]": data.endDateTime ?? "",
    });
    if (!isAvailable) {
      const retries = (RESERVATION_CACHE?.attempts || 0) + 1;
      await reservationCacheService.save(reservationKey, {
        ...RESERVATION_CACHE,
        ...data,
        attempts: retries,
      } satisfies Partial<ReservationState>);

      return humanizerAgent(
        `
          Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.
          Tienes ${ATTEMPTS - retries} intentos restantes.
        `,
      );
    }

    // 2. ✅ INPUT DATA VALIDATED
    await reservationCacheService.save(reservationKey, {
      ...RESERVATION_CACHE,
      ...data,
      status: reservationStatuses.MAKE_VALIDATED,
    } satisfies Partial<ReservationState>);

    const responseMsg = systemMessages.getConfirmationMsg(data);
    return humanizerAgent(responseMsg);
  } catch (error) {
    //
    // BORRAR CACHE y REINICIAR
    return humanizerAgent(
      "Ocurrió un problema inesperado. ¿Podemos intentar de nuevo con los datos de la reserva?",
    );
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
      endDateTime = "",
      startDateTime = "",
      numberOfPeople = 1,
    } = RESERVATION_CACHE as ReservationState;

    let newCustomer = customer;
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
        day,
        status: "confirmed",
      });
      const reservation = (await res.json()) as { doc: Appointment };
      const assistantMsg = systemMessages.getSuccessMsg(reservation?.doc, {
        customerName: newCustomer.name ?? customerName,
        numberOfPeople,
        restaurantName: business?.name ?? "",
      });
      await reservationCacheService.delete(reservationKey ?? "");
      return humanizerAgent(assistantMsg);
    }
    return humanizerAgent("Cliente no pudo ser creado");
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
    const assistantResponse = systemMessages.getStartMsg(
      {
        userName: customer?.name,
      },
      "update",
    );
    await reservationCacheService.save(reservationKey ?? "", {
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name ?? "",
      customerPhone,
      status: reservationStatuses.MAKE_STARTED,
    });
    return humanizerAgent(assistantResponse);
  }

  // FALLBACK
  if (customerMessage) {
    const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva ó ${CustomerActions.EXIT} para salir`;
    return humanizerAgent(assistanceMsg);
  }
};
