import { Handler } from "hono/types";
import { ModuleCtx } from "@/domain/booking";
import { cmsAdapter } from "@/infraestructure/adapters/cms";
import { ragService, SyncStateRequest } from "@/application/services/rag";
import { logger } from "@/infraestructure/logging";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const contentSyncStateHandler: Handler<ModuleCtx> = async (c) => {
  const businessId = c.req.param("businessId") ?? "";
  if (!businessId) {
    return c.json({ error: "Business ID not received" }, 400);
  }
  await ragService.init();
  const data = await c.req.json<SyncStateRequest>();

  if (data.collection === "businesses") {
    if (data.operation === "delete") {
      await ragService.deleteAllProducts(businessId);
    } else {
      await cmsAdapter.syncStaledBusiness(data.businessId);
    }
    logger.info("Business update triggered 🔄");
  }
  //
  else if (data.collection === "products") {
    if (data.operation === "delete") {
      await ragService.deleteProductById(data.docId);
    } else {
      const product = await cmsAdapter.getProductById(data.docId);
      await ragService.upsertProduct(product);
    }
    logger.info("Product update triggered 🔄");
  }

  return c.json({
    message: "Vector ingestion successful",
    data,
  });
};
