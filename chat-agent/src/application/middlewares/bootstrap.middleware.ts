import { MiddlewareHandler } from "hono/types";
import { RestaurantCtx, RestaurantIntent } from "@/domain/restaurant";
import { WahaRecievedEvent } from "@/infraestructure/adapters/whatsapp";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { cmsAdapter } from "@/infraestructure/adapters/cms";
import { BookingState } from "@/domain/restaurant/booking";
import { DomainKinds } from "../services/rag";

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export const bootstrapMiddleware = (): MiddlewareHandler<RestaurantCtx> => {
  return async (ctx, next) => {
    const custumerRecievedEvent = await ctx.req.json<WahaRecievedEvent>();
    const businessId = ctx.req.param("businessId") ?? "";
    const session = custumerRecievedEvent.session;
    const event = custumerRecievedEvent.event;
    const customerMessage = (custumerRecievedEvent.payload.body || "").trim();
    const customerPhone = custumerRecievedEvent.payload.from;
    const chatKey = `chat:${businessId}:${customerPhone}`;
    const bookingKey = `booking:${businessId}:${customerPhone}`;
    const intentKey = `intent:${businessId}:${customerPhone}`;
    const bookingState = await cacheAdapter.getObj<BookingState>(bookingKey);
    const intentState = await cacheAdapter.getObj<RestaurantIntent>(intentKey);

    ctx.set("session", session);
    ctx.set("whatsappEvent", event);
    ctx.set("chatKey", chatKey);
    ctx.set("intentKey", intentKey);
    ctx.set("intentState", intentState);
    ctx.set("bookingKey", bookingKey);
    ctx.set("bookingState", bookingState);

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

    const customer = await cmsAdapter.getCostumerByPhone({
      "where[business][equals]": businessId,
      "where[phoneNumber][like]": customerPhone,
    });
    const business = await cmsAdapter.getBusinessById(businessId);

    if (!business) {
      return ctx.json({ error: "Business not found" }, 404);
    }

    const activeDomains: DomainKinds[] = ["booking", "transversal"];

    if (business.general.businessType === "restaurant") {
      ctx.set("activeDomains", activeDomains.concat(["restaurant"]));
    }
    if (business.general.businessType === "real_estate") {
      ctx.set("activeDomains", activeDomains.concat(["real-state"]));
    }
    if (business.general.businessType === "erotic") {
      ctx.set("activeDomains", activeDomains.concat(["erotic"]));
    }

    ctx.set("customer", customer); // can be undefined
    ctx.set("business", business);

    await next();
  };
};
