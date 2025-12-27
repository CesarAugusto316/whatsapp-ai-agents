import { reserveSchema } from "@/ai-agents/schemas";
import {
  classifyCustomerIntent,
  infoReservationAgent,
} from "@/ai-agents/agent.config";
import {
  buildApiDates,
  parseStringReservation,
  renderAssistantText,
} from "@/ai-agents/tools/helpers";
import {
  buildRestaurantInfo,
  flowMessages,
  reservationMessages,
} from "@/ai-agents/tools/prompts";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import reservationService from "@/services/reservationCache.service";
import { Appointment, Customer } from "@/types/business/cms-types";
import { CTX, CtxState } from "@/types/hono.types";
import { ModelMessage } from "ai";
import { Handler } from "hono/types";
import { safeParse, string } from "zod";
import {
  CUSTOMER_INTENT,
  CustomerActions,
  FlowOptions,
  ReStatus,
} from "@/ai-agents/agent.types";

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export const makeReservationHandler: Handler<CTX> = async (ctx, next) => {
  const RESERVATION_CACHE = ctx.get("currentReservation");
  const business = ctx.get("business");
  const customerMessage = ctx.get("customerMessage");
  const customerPhone = ctx.get("customerPhone");
  const customer = ctx.get("customer");
  const chatKey = ctx.get("chatKey");
  const reservationKey = ctx.get("reservationKey");

  // const text = await makeReservationFlow({
  //   business,
  //   customer,
  //   customerMessage,
  //   customerPhone,
  //   reservationKey,
  //   currentReservation: RESERVATION_CACHE,
  // });

  // if (text) {
  //   await chatHistoryService.save(chatKey, customerMessage, text);
  //   return ctx.json({
  //     received: true,
  //     text,
  //   });
  // }
  await next();
};

export async function makeReservationFlow(
  ctx: Partial<CtxState>,
): Promise<void | string> {
  const {
    business,
    customer,
    customerMessage,
    customerPhone,
    reservationKey,
    currentReservation: RESERVATION_CACHE,
  } = ctx;

  // TODO: implement a retry system,
  // if user fails to provide valid input > 2, send a message asking for help
  // otherwise the user will be a loop
  if (RESERVATION_CACHE?.status === ReStatus.MAKE_STARTED && customerMessage) {
    const parseInput = parseStringReservation(
      customerMessage,
      customer?.name ? 3 : 4,
    );
    if (!parseInput.success) {
      return parseInput.error ?? "Datos inválidos";
    }
    const { success, data, error } = safeParse(reserveSchema, parseInput.data);
    if (!success) {
      return error.message ?? "Datos inválidos";
    }
    const isAvailable = await businessService.checkAvailability(
      data?.day,
      data.startTime,
      (business?.schedule?.averageTime ?? 1) * 60,
    );
    if (!isAvailable) {
      return "Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.";
    }
    await reservationService.save(reservationKey ?? "", {
      ...RESERVATION_CACHE,
      customerName: data.name ?? customer?.name,
      day: data.day,
      startTime: data.startTime,
      numberOfPeople: data.numberOfPeople,
      status: ReStatus.MAKE_VALIDATED,
      // step: ReservationStep.VALIDATED,
    });
    const assistantResponse = reservationMessages.getConfirmationMsg({
      ...data,
      name: data?.name ?? customer?.name,
    });
    return assistantResponse;
  }

  if (RESERVATION_CACHE?.status === ReStatus.MAKE_VALIDATED) {
    // FINAL OPTION: 1. CONFIRMAR
    if (customerMessage?.toUpperCase() === CustomerActions.CONFIRM) {
      const {
        customerName = "",
        day = "",
        startTime = "",
        numberOfPeople = 1,
      } = RESERVATION_CACHE;
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
          customerName: newCustomer.name,
          numberOfPeople,
          endDateTime,
          day: reservationDay,
          status: "confirmed",
        });
        const reservation = (await res.json()) as { doc: Appointment };
        const assistantMsg = reservationMessages.getSuccessMsg(
          reservation?.doc,
          {
            customerName: newCustomer.name,
            numberOfPeople,
            restaurantName: business?.name ?? "",
          },
        );
        await reservationService.delete(reservationKey ?? "");
        return assistantMsg;
      }
      return "Cliente no pudo ser creado";
    }

    // FINAL OPTION: 2. SALIR
    if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
      await reservationService.delete(reservationKey ?? "");
      const assistantMsg = flowMessages.getExitMsg();
      return assistantMsg;
    }

    // FINAL OPTION: 3. REINGRESAR DATOS
    if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
      // RESTART
      const assistantResponse = reservationMessages.getReStartMsg({
        userName: customer?.name,
      });
      await reservationService.save(reservationKey ?? "", {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: ReStatus.MAKE_STARTED,
      });
      return assistantResponse;
    }

    // FALLBACK
    if (customerMessage) {
      const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
      return assistanceMsg;
    }
  }
}

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export const updateReservationHandler: Handler<CTX> = async (ctx, next) => {
  const customer = ctx.get("customer");
  const RESERVATION_CACHE = ctx.get("currentReservation");
  const reservationKey = ctx.get("reservationKey") ?? "";
  const business = ctx.get("business");
  const customerMessage = ctx.get("customerMessage");
  const customerPhone = ctx.get("customerPhone");
  const chatKey = ctx.get("chatKey");

  if (!customer)
    return ctx.json({
      received: true,
      text: "Aún no te has registrado, por favor has tu primera reserva para registrarte",
    });

  if (
    RESERVATION_CACHE?.status === ReStatus.CANCEL_STARTED &&
    RESERVATION_CACHE?.id
  ) {
    const customerMessage = ctx.get("customerMessage");
    const chatKey = ctx.get("chatKey");

    if (customerMessage.toUpperCase() === CustomerActions.YES) {
      const res = await businessService.updateAppointment(
        RESERVATION_CACHE.id,
        { status: "cancelled" },
      );
      if (res.status !== 200) {
        return ctx.json({
          received: true,
          text: `Error al cancelar la reserva ${RESERVATION_CACHE.id}`,
        });
      }
      const assistantResponse = `Reserva ${RESERVATION_CACHE.id} cancelada exitosamente ✅`;
      await reservationService.delete(reservationKey);
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
    if (customerMessage.toUpperCase() === CustomerActions.NO) {
      const assistantResponse = flowMessages.getExitMsg();
      await reservationService.delete(reservationKey);
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
    if (customerMessage) {
      const assistantResponse = `Escribe ${CustomerActions.YES} para confirmar o ${CustomerActions.NO} para cancelar`;
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
  }

  // TODO: implement a retry system,
  // if user fails to provide valid input > 2, send a message asking for help
  // otherwise the user will be a loop
  if (RESERVATION_CACHE?.status === ReStatus.UPDATE_PRE_START) {
    // START
    if (customerMessage && !RESERVATION_CACHE?.id) {
      const { success, data } = safeParse(
        string().min(2).max(60),
        customerMessage.trim(),
      );
      if (!success) {
        return ctx.json({
          received: true,
          text: "Por favor, ingresa un ID válido entre 2 y 60 caracteres.",
        });
      }
      const reservation = (await (
        await businessService.getAppointmentById(data)
      ).json()) as Appointment;

      if (!reservation) {
        return ctx.json({
          received: true,
          text: "Reserva no encontrada. Escribe un ID válido.",
        });
      }
      const assistantResponse = `Escribe la palabra ${CustomerActions.UPDATE} para actualizar la reserva. o ${CustomerActions.CANCEL} para cancelarla.`;
      await reservationService.save(reservationKey, {
        ...RESERVATION_CACHE,
        id: reservation.id,
      });
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
    if (
      customerMessage.toUpperCase() === CustomerActions.UPDATE &&
      RESERVATION_CACHE?.id
    ) {
      const assistantResponse = reservationMessages.getStartMsg({
        userName: customer?.name,
        mode: "update",
      });
      await reservationService.save(reservationKey, {
        ...RESERVATION_CACHE,
        status: ReStatus.UPDATE_STARTED,
      });
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
    if (
      customerMessage.toUpperCase() === CustomerActions.CANCEL &&
      RESERVATION_CACHE?.id
    ) {
      const assistantResponse = `Seguro que desea cancelar su reserva? esta accion no se puede revertir. Escribe ${CustomerActions.YES} para confirmar o ${CustomerActions.NO} para cancelar`;
      await reservationService.save(reservationKey, {
        ...RESERVATION_CACHE,
        status: ReStatus.CANCEL_STARTED,
      });
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
  }

  if (
    RESERVATION_CACHE?.status === ReStatus.UPDATE_STARTED &&
    RESERVATION_CACHE?.id &&
    customerMessage
  ) {
    const parseInput = parseStringReservation(customerMessage, 3); // customerName already provided
    if (!parseInput.success) {
      return ctx.json({
        received: true,
        text: parseInput.error,
      });
    }
    const { success, data, error } = safeParse(reserveSchema, parseInput.data);
    if (!success) {
      return ctx.json({
        received: true,
        text: error,
      });
    }
    const isAvailable = await businessService.checkAvailability(
      data?.day,
      data.startTime,
      business.schedule.averageTime * 60,
    );
    if (!isAvailable) {
      return ctx.json({
        received: true,
        text: "Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.",
      });
    }
    await reservationService.save(reservationKey, {
      ...RESERVATION_CACHE,
      customerName: customer?.name,
      day: data.day,
      startTime: data.startTime,
      numberOfPeople: data.numberOfPeople,
      status: ReStatus.UPDATE_VALIDATED,
    });
    const assistantResponse = reservationMessages.getConfirmationMsg(
      {
        ...data,
        name: customer?.name,
      },
      "update",
    );
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return ctx.json({
      received: true,
      text: assistantResponse,
    });
  }

  if (RESERVATION_CACHE?.status === ReStatus?.UPDATE_VALIDATED) {
    // FINAL OPTION: 1. CONFIRMAR
    if (customerMessage.toUpperCase() === CustomerActions.CONFIRM) {
      const {
        day = "",
        startTime = "",
        numberOfPeople = 1,
      } = RESERVATION_CACHE;
      const {
        day: reservationDay,
        endDateTime,
        startDateTime,
      } = buildApiDates(day, startTime, business.schedule.averageTime * 60); // use business average reservation time

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
            day: reservationDay,
            status: "confirmed",
            // ADD NUMBER OF PEOPLE
          },
        );
        const reservation = (await res.json()) as { doc: Appointment };
        const assistantMsg = reservationMessages.getSuccessMsg(
          reservation?.doc,
          {
            customerName: customer?.name,
            numberOfPeople,
            restaurantName: business?.name ?? "",
            mode: "update",
          },
        );
        await reservationService.delete(reservationKey);
        await chatHistoryService.save(chatKey, customerMessage, assistantMsg);
        return ctx.json({
          received: true,
          text: assistantMsg,
          reservation,
        });
      }
      return ctx.json({ error: "Customer not created" });
    }

    // FINAL OPTION: 2. SALIR
    if (customerMessage.toUpperCase() === CustomerActions.EXIT) {
      await reservationService.delete(reservationKey);
      const assistantMsg = flowMessages.getExitMsg();
      await chatHistoryService.save(chatKey, customerMessage, assistantMsg);
      return ctx.json({
        received: true,
        text: assistantMsg,
      });
    }

    // FINAL OPTION: 3. REINGRESAR DATOS
    if (customerMessage.toUpperCase() === CustomerActions.RESTART) {
      // RESTART
      const assistantResponse = reservationMessages.getReStartMsg({
        userName: customer?.name,
        mode: "update",
      });
      await reservationService.save(reservationKey, {
        ...RESERVATION_CACHE,
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: ReStatus.UPDATE_STARTED,
        // step: ReservationStep.STARTED,
      });
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }

    // FALLBACK
    if (customerMessage) {
      const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
      await chatHistoryService.save(chatKey, customerMessage, assistanceMsg);
      return ctx.json({
        received: true,
        text: assistanceMsg,
      });
    }
  }

  await next();
};

/**
 *
 * @description Handles the GLOBAL flow of the conversation
 * @param ctx
 * @returns
 */
export const flowHandler: Handler<CTX> = async (ctx) => {
  const business = ctx.get("business");
  const customerMessage = ctx.get("customerMessage");
  const customerPhone = ctx.get("customerPhone");
  const chatKey = ctx.get("chatKey");
  const chatHistoryCache = await chatHistoryService.get(chatKey);
  const customer = ctx.get("customer");
  const reservationKey = ctx.get("reservationKey");
  const RESERVATION_CACHE = ctx.get("currentReservation");

  // 1. DETERMINISTIC FLOW AND CORE BUSINESS LOGIC
  if (!RESERVATION_CACHE) {
    //
    const isFirstMessage = chatHistoryCache.length === 0;
    if (isFirstMessage || customerMessage == FlowOptions.HOW_SYSTEM_WORKS) {
      // choices 0 & 4
      const assistantResponse = flowMessages.getWelcomeMsg({
        restaurantName: business?.name ?? "",
      });
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
    if (customerMessage == FlowOptions.GENERAL_INFO) {
      // choice 1
      const assistantResponse = buildRestaurantInfo(business);
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
    if (customerMessage == FlowOptions.MAKE_RESERVATION) {
      // START
      const assistantResponse = reservationMessages.getStartMsg({
        userName: customer?.name,
      });
      await reservationService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: ReStatus.MAKE_STARTED,
      });
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      // START
      const assistantResponse = reservationMessages.enterReservationId();
      await reservationService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: ReStatus.UPDATE_PRE_START,
      });
      await chatHistoryService.save(
        chatKey,
        customerMessage,
        assistantResponse,
      );
      return ctx.json({
        received: true,
        text: assistantResponse,
      });
    }
  }

  // 2. INTENT HANDLING WHEN CUSTOMER ASKS THE HOW OF SOMETHING
  const customerIntent = await classifyCustomerIntent(customerMessage);

  if (customerIntent === CUSTOMER_INTENT.HOW) {
    // choices 0 & 4
    const assistantResponse = flowMessages.howSystemWorksMsg();
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return ctx.json({
      received: true,
      text: assistantResponse,
    });
  }

  // 3. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const messages: ModelMessage[] = [
    ...chatHistoryCache, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];
  const result = await infoReservationAgent({
    messages,
    business,
    customerPhone,
  });
  const assistantResponse = renderAssistantText(result);
  await chatHistoryService.save(chatKey, customerMessage, assistantResponse);

  return ctx.json({
    received: true,
    text: assistantResponse,
    messages,
    result,
  });
};
