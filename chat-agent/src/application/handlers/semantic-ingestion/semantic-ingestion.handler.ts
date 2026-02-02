import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { logger } from "@/infraestructure/logging";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const semanticIngestionHandler: Handler<
  DomainCtx<RestaurantCtx>
> = async (c) => {
  const businessId = c.req.param("businessId") ?? "";
  if (!businessId) {
    return c.json({ error: "Business ID not received" }, 400);
  }
  const data = await c.req.json();

  return c.json({
    message: "Vector ingestion successful",
    data,
  });
};
