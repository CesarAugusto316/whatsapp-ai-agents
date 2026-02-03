import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { SemanticIngestionRequest } from "./semantic.types";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const semanticIntentHandler: Handler<DomainCtx<RestaurantCtx>> = async (
  c,
) => {
  const data = await c.req.json<SemanticIngestionRequest>();

  return c.json({
    message: "Vector intent successful",
    data,
  });
};
