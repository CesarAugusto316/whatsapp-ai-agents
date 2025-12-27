import {
  classifyCustomerIntent,
  infoReservationAgent,
} from "@/ai-agents/agent.config";
import {
  CUSTOMER_INTENT,
  CustomerActions,
  FlowOptions,
  ReservationState,
  ReStatus,
} from "@/ai-agents/agent.types";
import { reserveSchema } from "@/ai-agents/schemas";
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
import reservationCacheService from "@/services/reservationCache.service";
import { Appointment, Customer } from "@/types/business/cms-types";
import { CtxState } from "@/types/hono.types";
import { ModelMessage } from "ai";
import { safeParse, string } from "zod";

type FlowResult = string | void | Promise<string | void>;
type FlowHandler = (ctx: Readonly<CtxState>) => FlowResult;
type Evn = keyof typeof ReStatus;

class ChatFlow {
  private handlers: Record<string, FlowHandler[]> = {};

  constructor(public readonly ctx: Readonly<CtxState>) {}

  on(event: Evn, handler: FlowHandler): this {
    (this.handlers[event] ??= []).push(handler);
    return this;
  }

  async run(): Promise<FlowResult | void> {
    const status = this.ctx.RESERVATION_CACHE?.status;
    if (!status) return;

    const handlers = this.handlers[status] ?? [];
    for (const h of handlers) {
      const res = await h(this.ctx);
      if (res) return res;
    }
  }
}

async function preFlow(ctx: CtxState): Promise<string> {
  const {
    RESERVATION_CACHE,
    customerMessage = "",
    customerPhone = "",
    reservationKey = "",
    customer,
    business,
    chatKey = "",
  } = ctx;

  // 1. DETERMINISTIC FLOW AND CORE BUSINESS LOGIC
  if (!RESERVATION_CACHE) {
    //
    const chatHistoryCache = await chatHistoryService.get(chatKey);
    const isFirstMessage = chatHistoryCache.length === 0;
    if (isFirstMessage) {
      // before any choice
      const assistantResponse = flowMessages.getWelcomeMsg({
        restaurantName: business?.name ?? "",
      });
      return assistantResponse;
    }
    if (customerMessage == FlowOptions.GENERAL_INFO) {
      // choice 1
      const assistantResponse = buildRestaurantInfo(business);
      return assistantResponse;
    }
    if (customerMessage == FlowOptions.MAKE_RESERVATION) {
      // choice 2
      const assistantResponse = reservationMessages.getStartMsg({
        userName: customer?.name,
      });
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: ReStatus.MAKE_STARTED,
      });
      return assistantResponse;
    }
    if (customerMessage == FlowOptions.UPDATE_RESERVATION) {
      // choice 3
      const assistantResponse = reservationMessages.enterReservationId();
      await reservationCacheService.save(reservationKey, {
        businessId: business?.id,
        customerId: customer?.id,
        customerName: customer?.name ?? "",
        customerPhone,
        status: ReStatus.UPDATE_PRE_START,
      });
      return assistantResponse;
    }
    if (customerMessage == FlowOptions.HOW_SYSTEM_WORKS) {
      // choice 4
      const assistantResponse = flowMessages.howSystemWorksMsg();
      return assistantResponse;
    }
  }

  // 2. INTENT HANDLING WHEN CUSTOMER ASKS THE HOW OF SOMETHING
  const customerIntent = await classifyCustomerIntent(customerMessage);

  if (customerIntent === CUSTOMER_INTENT.HOW) {
    // choice 4 again
    const assistantResponse = flowMessages.howSystemWorksMsg();
    return assistantResponse;
  }

  // 3. DEFAULT FALLBACK WITH AI AGENT WHEN CUSTOMER ASKS THE WHAT OF SOMETHING
  const chatHistoryCache = await chatHistoryService.get(chatKey);
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
  return assistantResponse;
}

/**
 *
 * @description Initialize the flow for the chatbot
 * @param ctx
 * @returns
 */
export async function initFlow(ctx: CtxState): Promise<string> {
  const coreFlow = new ChatFlow(ctx);

  coreFlow
    .on("MAKE_STARTED", async (ctx) => {
      const {
        RESERVATION_CACHE,
        business,
        customerMessage,
        customer,
        reservationKey,
      } = ctx;

      const parseInput = parseStringReservation(
        customerMessage,
        customer?.name ? 3 : 4,
      );
      if (!parseInput.success) {
        return parseInput.error ?? "Datos inválidos";
      }
      const { success, data, error } = safeParse(
        reserveSchema,
        parseInput.data,
      );
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
      await reservationCacheService.save(reservationKey ?? "", {
        ...RESERVATION_CACHE,
        customerName: data.name ?? customer?.name,
        day: data.day,
        startTime: data.startTime,
        numberOfPeople: data.numberOfPeople,
        status: ReStatus.MAKE_VALIDATED,
      });
      const assistantResponse = reservationMessages.getConfirmationMsg({
        ...data,
        name: data?.name ?? customer?.name,
      });
      return assistantResponse;
    })
    .on("MAKE_VALIDATED", async (ctx) => {
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
          startTime = "",
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
          const assistantMsg = reservationMessages.getSuccessMsg(
            reservation?.doc,
            {
              customerName: newCustomer.name ?? customerName,
              numberOfPeople,
              restaurantName: business?.name ?? "",
            },
          );
          await reservationCacheService.delete(reservationKey ?? "");
          return assistantMsg;
        }
        return "Cliente no pudo ser creado";
      }

      // FINAL OPTION: 2. SALIR
      if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
        await reservationCacheService.delete(reservationKey ?? "");
        const assistantMsg = flowMessages.getExitMsg();
        return assistantMsg;
      }

      // FINAL OPTION: 3. REINGRESAR DATOS
      if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
        // RESTART
        const assistantResponse = reservationMessages.getReStartMsg({
          userName: customer?.name,
        });
        await reservationCacheService.save(reservationKey ?? "", {
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
    })
    .on("CANCEL_STARTED", async (ctx) => {
      const { RESERVATION_CACHE, customerMessage, reservationKey, customer } =
        ctx;

      if (!customer) {
        return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
      }

      if (RESERVATION_CACHE?.id) {
        //
        if (customerMessage.toUpperCase() === CustomerActions.YES) {
          const res = await businessService.updateAppointment(
            RESERVATION_CACHE.id,
            { status: "cancelled" },
          );
          if (res.status !== 200) {
            return `Error al cancelar la reserva ${RESERVATION_CACHE.id}`;
          }
          const assistantResponse = `Reserva ${RESERVATION_CACHE.id} cancelada exitosamente ✅`;
          await reservationCacheService.delete(reservationKey);
          return assistantResponse;
        }
        if (customerMessage.toUpperCase() === CustomerActions.NO) {
          const assistantResponse = flowMessages.getExitMsg();
          await reservationCacheService.delete(reservationKey);
          return assistantResponse;
        }
        if (customerMessage) {
          const assistantResponse = `Escribe ${CustomerActions.YES} para confirmar o ${CustomerActions.NO} para cancelar`;
          return assistantResponse;
        }
      }
    })
    .on("UPDATE_PRE_START", async (ctx) => {
      const { RESERVATION_CACHE, customerMessage, reservationKey, customer } =
        ctx;

      if (!customer) {
        return "Aún no te has registrado, por favor has tu primera reserva para registrarte";
      }
      // START
      if (!RESERVATION_CACHE?.id) {
        const { success, data } = safeParse(
          string().min(2).max(60),
          customerMessage.trim(),
        );
        if (!success) {
          return "Por favor, ingresa un ID válido entre 2 y 60 caracteres.";
        }
        const reservation = (await (
          await businessService.getAppointmentById(data)
        ).json()) as Appointment;

        if (!reservation) {
          return "Reserva no encontrada. Escribe un ID válido.";
        }
        const assistantResponse = `Escribe la palabra ${CustomerActions.UPDATE} para actualizar la reserva. o ${CustomerActions.CANCEL} para cancelarla.`;
        await reservationCacheService.save(reservationKey, {
          ...RESERVATION_CACHE,
          id: reservation.id,
        });
        return assistantResponse;
      }
      if (
        customerMessage?.toUpperCase() === CustomerActions.UPDATE &&
        RESERVATION_CACHE?.id
      ) {
        const assistantResponse = reservationMessages.getStartMsg({
          userName: customer?.name,
          mode: "update",
        });
        await reservationCacheService.save(reservationKey ?? "", {
          ...RESERVATION_CACHE,
          status: ReStatus.UPDATE_STARTED,
        });
        return assistantResponse;
      }
      if (
        customerMessage?.toUpperCase() === CustomerActions.CANCEL &&
        RESERVATION_CACHE?.id
      ) {
        const assistantResponse = `Seguro que desea cancelar su reserva? esta accion no se puede revertir. Escribe ${CustomerActions.YES} para confirmar o ${CustomerActions.NO} para cancelar`;
        await reservationCacheService.save(reservationKey ?? "", {
          ...RESERVATION_CACHE,
          status: ReStatus.CANCEL_STARTED,
        });
        return assistantResponse;
      }
    })
    .on("UPDATE_STARTED", async (ctx) => {
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

      if (RESERVATION_CACHE?.id) {
        const parseInput = parseStringReservation(customerMessage, 3); // customerName already provided
        if (!parseInput.success) {
          return (
            parseInput.error ??
            "Por favor, proporciona una fecha y hora válidas"
          );
        }
        const { success, data, error } = safeParse(
          reserveSchema,
          parseInput.data,
        );
        if (!success) {
          return (
            error.message ?? "Por favor, proporciona una fecha y hora válidas"
          );
        }
        const isAvailable = await businessService.checkAvailability(
          data?.day,
          data.startTime,
          business.schedule.averageTime * 60,
        );
        if (!isAvailable) {
          return "Lo sentimos, no hay disponibilidad para esa fecha y hora. Selecciona otra fecha y hora.";
        }
        await reservationCacheService.save(reservationKey, {
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
        return assistantResponse;
      }
    })
    .on("UPDATE_VALIDATED", async (ctx) => {
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
          startTime = "",
          numberOfPeople = 1,
        } = RESERVATION_CACHE as ReservationState;
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
          await reservationCacheService.delete(reservationKey ?? "");
          return assistantMsg;
        }
        return "Customer not created";
      }

      // FINAL OPTION: 2. SALIR
      if (customerMessage?.toUpperCase() === CustomerActions.EXIT) {
        await reservationCacheService.delete(reservationKey ?? "");
        const assistantMsg = flowMessages.getExitMsg();
        return assistantMsg;
      }

      // FINAL OPTION: 3. REINGRESAR DATOS
      if (customerMessage?.toUpperCase() === CustomerActions.RESTART) {
        // RESTART
        const assistantResponse = reservationMessages.getReStartMsg({
          userName: customer?.name,
          mode: "update",
        });
        await reservationCacheService.save(reservationKey ?? "", {
          ...RESERVATION_CACHE,
          businessId: business?.id,
          customerId: customer?.id,
          customerName: customer?.name ?? "",
          customerPhone: customer.phoneNumber,
          status: ReStatus.UPDATE_STARTED,
        });
        return assistantResponse;
      }

      // FALLBACK
      if (customerMessage) {
        const assistanceMsg = `Tienes una reserva disponible. Escribe: ${CustomerActions.CONFIRM} para confirmar reserva, ${CustomerActions.RESTART} para cambiar algun dato, ó ${CustomerActions.EXIT} para salir`;
        return assistanceMsg;
      }
    });

  const result = await coreFlow.run();

  if (result) {
    await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, result);
    return result;
  }
  const preResult = await preFlow(ctx);
  await chatHistoryService.save(ctx.chatKey, ctx.customerMessage, preResult);
  return preResult;
}
