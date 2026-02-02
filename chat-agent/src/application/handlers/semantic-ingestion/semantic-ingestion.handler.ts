import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { SemanticIngestionRequest } from "./semantic.types";
import { cmsClient } from "@/infraestructure/http/cms";
import { aiClient } from "@/infraestructure/http/ai";
import { Product } from "@/infraestructure/http/cms/cms-types";
import { logger } from "@/infraestructure/logging";
import { ragService } from "@/infraestructure/db/qdrant";

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

  if (data.collection === "businesses") {
    let isStale = false;
    if (data.operation === "update") {
      isStale = true;
    }
    const res = await cmsClient.getBusinessById(data.businessId, isStale);
    logger.info("Business update triggered 🔄", res);
  }
  //
  else if (data.collection === "products") {
    const product = await cmsClient.getProductById(data.docId);
    const vector = await ragService.upsertProduct(product);
    console.log({ vector });
  }

  return c.json({
    message: "Vector ingestion successful",
    data,
  });
};
