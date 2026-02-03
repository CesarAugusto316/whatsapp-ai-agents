import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { SemanticIngestionRequest } from "./semantic.types";
import { cmsClient } from "@/infraestructure/http/cms";
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
  const data = await c.req.json<SemanticIngestionRequest>();

  if (data.collection === "businesses") {
    if (data.operation === "delete") {
      await ragService.deleteAllProducts(businessId);
      await ragService.deleteBusinsessById(businessId);
    } else {
      const isStale = true;
      const business = await cmsClient.getBusinessById(
        data.businessId,
        isStale,
      );
      await ragService.upsertBusiness(business);
    }
    logger.info("Business update triggered 🔄");
  }
  //
  else if (data.collection === "products") {
    if (data.operation === "delete") {
      await ragService.deleteProductById(data.docId);
    } else {
      const product = await cmsClient.getProductById(data.docId);
      await ragService.upsertProduct(product);
    }
    logger.info("Product update triggered 🔄");
  }

  return c.json({
    message: "Vector ingestion successful",
    data,
  });
};
