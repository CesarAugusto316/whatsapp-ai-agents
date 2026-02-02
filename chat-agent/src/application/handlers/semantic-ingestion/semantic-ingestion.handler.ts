import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { SemanticIngestionRequest } from "./semantic.types";
import { cmsClient } from "@/infraestructure/http/cms";

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
  const data: SemanticIngestionRequest = await c.req.json();

  let isStale = false;
  if (data.collection === "businesses" && data.operation === "update") {
    isStale = true;
  }

  const res = await cmsClient.getBusinessById(data.businessId, isStale);
  console.log(res);
  return c.json({
    message: "Vector ingestion successful",
    data,
  });
};
