import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { SemanticIngestionRequest } from "./semantic.types";
import { cmsClient } from "@/infraestructure/http/cms";
import { vectorDB } from "@/infraestructure/db/qdrant";
import { aiClient } from "@/infraestructure/http/ai";

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
    console.log(res);

    const chunks = res?.general.description ?? "";

    // dividir el contenido en chunks (segun comprendo)
    const embeddingRes: number[][] = await aiClient.embedding({
      documents: chunks,
    });

    console.log({ embeddingRes });

    await vectorDB.upsert("business", {
      wait: true,
      // batch
      points: [
        {
          id: crypto.randomUUID(),
          vector: embeddingRes,
          payload: { businessId, chunks },
        },
      ],
    });
  }

  if (data.collection === "products") {
    // fetch products
  }

  return c.json({
    message: "Vector ingestion successful",
    data,
  });
};
