import businessService from "@/services/business.service";
import reservationCacheService from "@/services/reservationCache.service";
import { CTX } from "@/types/hono.types";
import { WahaRecievedEvent } from "@/types/whatsapp/received-event";
import { Handler } from "hono/types";

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export const contextMiddleware: Handler<CTX> = async (ctx, next) => {
  const custumerRecievedEvent = await ctx.req.json<WahaRecievedEvent>();
  const businessId = ctx.req.param("businessId");
  const session = custumerRecievedEvent.session;
  const event = custumerRecievedEvent.event;
  const customerMessage = (custumerRecievedEvent.payload.body || "").trim();
  const customerPhone = custumerRecievedEvent.payload.from;
  const chatKey = `chat:${businessId}:${customerPhone}`;
  const reservationKey = `reservation:${businessId}:${customerPhone}`;
  const customer = await businessService.getCostumerByPhone({
    "where[business][equals]": businessId,
    "where[phoneNumber][like]": customerPhone,
  });
  const business = await businessService.getBusinessById(businessId);
  const currentReservation = await reservationCacheService.get(reservationKey);
  ctx.set("session", session);
  ctx.set("businessId", businessId);
  ctx.set("customerPhone", customerPhone);
  ctx.set("customerMessage", customerMessage);
  ctx.set("chatKey", chatKey);
  ctx.set("whatsappEvent", event);
  ctx.set("reservationKey", reservationKey);
  ctx.set("RESERVATION_CACHE", currentReservation);
  ctx.set("customer", customer);

  if (!customerMessage) {
    return ctx.json({ error: "Customer message not received" }, 400);
  }
  if (!business) {
    return ctx.json({ error: "Business not found" }, 404);
  }
  if (!customerPhone) {
    return ctx.json({ error: "Customer phone not received" }, 400);
  }

  ctx.set("business", business);
  await next();
};
