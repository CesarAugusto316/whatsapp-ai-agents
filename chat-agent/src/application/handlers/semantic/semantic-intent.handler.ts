import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { ragService } from "@/infraestructure/db/qdrant";
import {
  bookingIntents,
  Domain,
  SemanticIntent,
} from "@/domain/semantic/booking";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const semanticIntentHandler: Handler<DomainCtx<RestaurantCtx>> = async (
  c,
) => {
  const domain = c.req.query("domain") as Domain;

  const intents = new Map<Domain, SemanticIntent[]>([
    ["bookings", bookingIntents],
  ]);

  if (!intents.has(domain)) {
    return c.json(
      {
        message: "Domain not found",
      },
      404,
    );
  }
  try {
    const data = await ragService.upsertIntents(intents.get(domain) || []);
    return c.json({
      message: "Vector intent successful",
      data,
    });
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
};
