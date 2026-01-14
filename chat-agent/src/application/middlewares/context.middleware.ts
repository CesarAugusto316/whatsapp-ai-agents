import { MiddlewareHandler } from "hono/types";
import { DomainCtx } from "@/domain/context.types";
import { RestaurantCtx } from "@/domain/restaurant/context.types";
import { WahaRecievedEvent } from "@/infraestructure/http/whatsapp/whatsapp-types/received-event";
import cacheAdapter from "@/infraestructure/adapters/cache.adapter";
import cmsClient from "@/infraestructure/http/cms/cms.client";

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export const contextMiddleware = (): MiddlewareHandler<
  DomainCtx<RestaurantCtx>
> => {
  return async (ctx, next) => {
    const custumerRecievedEvent = await ctx.req.json<WahaRecievedEvent>();
    const businessId = ctx.req.param("businessId") ?? "";
    const session = custumerRecievedEvent.session;
    const event = custumerRecievedEvent.event;
    const customerMessage = (custumerRecievedEvent.payload.body || "").trim();
    const customerPhone = custumerRecievedEvent.payload.from;
    const chatKey = `chat:${businessId}:${customerPhone}`;
    const reservationKey = `reservation:${businessId}:${customerPhone}`;
    const currentReservation =
      await cacheAdapter.get<RestaurantCtx>(reservationKey);
    ctx.set("session", session);
    ctx.set("chatKey", chatKey);
    ctx.set("whatsappEvent", event);
    ctx.set("reservationKey", reservationKey);
    ctx.set("RESERVATION_STATE", currentReservation);

    if (!businessId) {
      return ctx.json({ error: "Business ID not received" }, 400);
    }
    if (!customerMessage) {
      return ctx.json({ error: "Customer message not received" }, 400);
    }
    /** @todo validate customerPhone with zod schema */
    if (customerPhone === "status@broadcast") {
      return ctx.json({ error: "Broadcast status not allowed" }, 400);
    }
    if (!customerPhone) {
      return ctx.json({ error: "Customer phone not received" }, 400);
    }

    ctx.set("businessId", businessId);
    ctx.set("customerMessage", customerMessage);
    ctx.set("customerPhone", customerPhone);

    const customer = await cmsClient.getCostumerByPhone({
      "where[business][equals]": businessId,
      "where[phoneNumber][like]": customerPhone,
    });
    const business = await cmsClient.getBusinessById(businessId);

    if (!business) {
      return ctx.json({ error: "Business not found" }, 404);
    }
    ctx.set("customer", customer); // can be undefined
    ctx.set("business", business);

    await next();
  };
};
