import { MiddlewareHandler } from "hono/types";
import { ModuleCtx } from "@/domain/booking";
import { WahaRecievedEvent } from "@/infraestructure/adapters/whatsapp";
import { cacheAdapter } from "@/infraestructure/adapters/cache";
import { cmsAdapter, SpecializedDomain } from "@/infraestructure/adapters/cms";
import type { BookingState } from "@/domain/booking";
import type { BeliefState, ModuleKind } from "@/application/services/pomdp";
import { ProductOrderState } from "@/domain/orders";

/**
 *
 * @param ctx
 * @param next
 * @returns
 */
export const bootstrapMiddleware = (): MiddlewareHandler<ModuleCtx> => {
  return async (ctx, next) => {
    const custumerRecievedEvent = await ctx.req.json<WahaRecievedEvent>();
    const businessId = ctx.req.param("businessId") ?? "";
    const session = custumerRecievedEvent.session;
    const event = custumerRecievedEvent.event;
    const customerMessage = (custumerRecievedEvent.payload.body || "").trim();
    const customerPhone = custumerRecievedEvent.payload.from;

    // ============================================
    // 1. VALIDATE
    // ============================================
    if (!event) {
      return ctx.json({ error: "Event not received" }, 400);
    }
    if (!session) {
      return ctx.json({ error: "Session not received" }, 400);
    }
    if (!businessId) {
      return ctx.json({ error: "Business ID not received" }, 400);
    }
    const business = await cmsAdapter.getBusinessById(businessId);
    if (!business) {
      return ctx.json({ error: "Business not found" }, 404);
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

    // ============================================
    // 2. GET CACHED DATA AND KEYS
    // ============================================
    const customer = await cmsAdapter.getCostumerByPhone({
      "where[business][equals]": businessId,
      "where[phoneNumber][like]": customerPhone,
    }); // can be undefined
    const chatKey = `chat:${businessId}:${customerPhone}`;
    const beliefKey = `belief:${businessId}:${customerPhone}`;
    const beliefState = await cacheAdapter.getObj<BeliefState>(beliefKey);
    const bookingKey = `booking:${businessId}:${customerPhone}`;
    const bookingState = await cacheAdapter.getObj<BookingState>(bookingKey);
    const productOrderKey = `product-order:${businessId}:${customerPhone}`;
    const productOrderState =
      await cacheAdapter.getObj<ProductOrderState>(productOrderKey);

    // ============================================
    // 3. SET CONTEXT
    // ============================================
    ctx.set("businessId", businessId);
    ctx.set("customerMessage", customerMessage);
    ctx.set("customerPhone", customerPhone);
    ctx.set("customer", customer); // can be undefined
    ctx.set("business", business);
    ctx.set("session", session);
    ctx.set("whatsappEvent", event);
    ctx.set("chatKey", chatKey);
    ctx.set("beliefKey", beliefKey);
    ctx.set("beliefState", beliefState);
    ctx.set("bookingKey", bookingKey);
    ctx.set("bookingState", bookingState);
    ctx.set("productOrderKey", productOrderKey);
    ctx.set("productOrderState", productOrderState);

    // ============================================
    // 4. SET ACTIVE MODULES
    // ============================================
    const domain: SpecializedDomain = business.general.businessType;
    const coreModules: ModuleKind[] = [
      "informational",
      "conversational-signal",
      "social-protocol",
    ];

    /**
     * Configuración de módulos por tipo de negocio.
     * Cada negocio activa solo los módulos que necesita.
     */
    const BUSINESS_MODULES: Record<SpecializedDomain, ModuleKind[]> = {
      restaurant: ["products", "orders", "booking", "delivery"],
      "real-estate": ["booking"],
      erotic: ["products", "orders", "booking"],
      medical: ["booking"],
      retail: ["products", "orders"],
      legal: ["booking"],
    };

    const modules = BUSINESS_MODULES[domain] || [];
    ctx.set("activeModules", coreModules.concat(modules));

    // 5. NEXT HANDLER
    await next();
  };
};
