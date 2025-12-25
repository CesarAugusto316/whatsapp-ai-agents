import {
  AGENT_NAME,
  FlowChoices,
  ReserveStatus,
  reserveSchema,
  parseStringReservation,
  FlowActions,
  makeReservationMessages,
  flowMessages,
  buildApiDates,
} from "@/ai-agents/schemas";
import { infoReservationAgent } from "@/ai-agents/agent.config";
import { renderAssistantText } from "@/ai-agents/tools/helpers";
import { buildRestaurantInfo } from "@/ai-agents/tools/prompts";
import businessService from "@/services/business.service";
import chatHistoryService from "@/services/chatHistory.service";
import reservationService from "@/services/reservation.service";
import { Appointment, Customer } from "@/types/business/cms-types";
import { CTX } from "@/types/hono.types";
import { ModelMessage } from "ai";
import { Handler } from "hono/types";
import { safeParse } from "zod/mini";

export const makeReservationHandler: Handler<CTX> = async (c, next) => {
  const business = c.get("business");
  const customerMessage = c.get("customerMessage");
  const customerPhone = c.get("customerPhone");
  const customer = c.get("customer");
  const chatKey = c.get("chatKey");
  const reservationKey = c.get("reservationKey");
  const currentReservation = c.get("currentReservation");

  if (!currentReservation && customerMessage == FlowChoices.MAKE_RESERVATION) {
    // START
    const assistantResponse = makeReservationMessages.getStartMsg({
      userName: customer?.name,
    });
    await reservationService.save(reservationKey, {
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone,
      status: ReserveStatus.STARTED,
    });
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }

  // TODO: implement a retry system,
  // if user fails to provide valid input > 2, send a message asking for help
  // otherwise the user will be a loop
  if (currentReservation?.status === ReserveStatus.STARTED && customerMessage) {
    const parseInput = parseStringReservation(customerMessage);
    if (!parseInput.success) {
      return c.json({
        received: true,
        text: parseInput.error,
      });
    }
    const { success, data, error } = safeParse(reserveSchema, parseInput.data);
    if (!success) {
      return c.json({
        received: true,
        text: error,
      });
    }
    await reservationService.save(reservationKey, {
      ...currentReservation,
      day: data.day,
      startTime: data.startTime,
      numberOfPeople: data.numberOfPeople,
      status: ReserveStatus.VALIDATED,
    });
    const assistantResponse = makeReservationMessages.getConfirmationMsg(data);
    // await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }

  // FINAL STEP: 1. CONFIRMAR
  if (
    currentReservation?.status === ReserveStatus.VALIDATED &&
    customerMessage.toUpperCase() === FlowActions.CONFIRM
  ) {
    const {
      customerName,
      day = "",
      startTime = "",
      numberOfPeople = 1,
    } = currentReservation;
    let newCustomer = customer;
    const {
      day: reservationDay,
      endDateTime,
      startDateTime,
    } = buildApiDates(day, startTime, business.schedule.averageTime * 60); // use business average reservation time

    if (!customer && customerName) {
      newCustomer = (
        (await (
          await businessService.createCostumer({
            business: business?.id,
            phoneNumber: customerPhone,
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
        endDateTime,
        day: reservationDay,
        status: "confirmed",
        // ADD NUMBER OF PEOPLE
      });
      const reservation = (await res.json()) as { doc: Appointment };
      console.log({ reservation, customer, business });

      const assistantMsg = makeReservationMessages.getSuccessMsg(
        reservation?.doc,
        {
          customerName: newCustomer.name,
          numberOfPeople,
          restaurantName: business?.name ?? "",
        },
      );
      await chatHistoryService.save(chatKey, customerMessage, assistantMsg);
      return c.json({
        received: true,
        text: assistantMsg,
        reservation,
      });
    }
    return c.json({ error: "Customer not created" });
  }

  // FINAL STEP: 2. SALIR
  if (
    currentReservation?.status === ReserveStatus.VALIDATED &&
    customerMessage.toUpperCase() === FlowActions.EXIT
  ) {
    await reservationService.delete(reservationKey);
    const assistantMsg = flowMessages.getExitMsg();
    await chatHistoryService.save(chatKey, customerMessage, assistantMsg);
    return c.json({
      received: true,
      text: assistantMsg,
    });
  }

  // FINAL STEP: 3. REINGRESAR DATOS
  if (
    currentReservation?.status === ReserveStatus.VALIDATED &&
    customerMessage.toUpperCase() === FlowActions.RESTART
  ) {
    // RESTART
    const assistantResponse = makeReservationMessages.getReStartMsg({
      userName: customer?.name,
    });
    await reservationService.save(reservationKey, {
      businessId: business?.id,
      customerId: customer?.id,
      customerName: customer?.name,
      customerPhone,
      status: ReserveStatus.STARTED,
    });
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }

  if (
    currentReservation?.status === ReserveStatus.VALIDATED &&
    customerMessage
  ) {
    const assistanceMsg = `Tienes una reserva disponible. Escribe: ${FlowActions.CONFIRM} para confirmar reserva, ${FlowActions.RESTART} para cambiar algun dato, ó ${FlowActions.EXIT} para salir`;
    await chatHistoryService.save(chatKey, customerMessage, assistanceMsg);
    return c.json({
      received: true,
      text: assistanceMsg,
    });
  }

  await next();
};

export const flowHandler: Handler<CTX> = async (c) => {
  const business = c.get("business");
  const customerMessage = c.get("customerMessage");
  const customerPhone = c.get("customerPhone");
  const customer = c.get("customer");
  const chatKey = c.get("chatKey");
  const chatHistory = await chatHistoryService.get(chatKey);
  const messages: ModelMessage[] = [
    ...chatHistory, // WE CAN LOAD MESSAGES FROM REDIS AS CONTEXT
    {
      role: "user",
      content: customerMessage,
    },
  ];
  const isFirstMessage = chatHistory.length === 0;

  if (isFirstMessage || customerMessage == FlowChoices.HOW_SYSTEM_WORKS) {
    // choices 0 & 4
    const assistantResponse = flowMessages.getWelcomeMsg({
      assistantName: AGENT_NAME,
      restaurantName: business?.name ?? "",
      userName: customer?.name,
    });
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }
  if (customerMessage == FlowChoices.GENERAL_INFO) {
    // choice 1
    const assistantResponse = buildRestaurantInfo(business);
    await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
    return c.json({
      received: true,
      text: assistantResponse,
    });
  }

  const result = await infoReservationAgent({
    messages,
    business,
    customerPhone,
  });
  const assistantResponse = renderAssistantText(result);
  await chatHistoryService.save(chatKey, customerMessage, assistantResponse);
  return c.json({
    received: true,
    text: assistantResponse,
    messages,
    result,
  });
};
