import { Handler } from "hono/types";
import { RestaurantCtx } from "@/domain/restaurant";
import { DomainCtx } from "@/domain/context.types";
import { ragService } from "@/infraestructure/db/qdrant";
import {
  bookingIntents,
  deliveryIntents,
  globalIntents,
} from "@/domain/semantic/universal-intents";
import { logger } from "@/infraestructure/logging";
import {
  eroticIntents,
  restaurantIntents,
  SpecializedSemanticIntent,
  SpecializedDomain,
} from "@/domain/semantic/specialized-intents";

/**
 *
 * @param c
 * @param next
 * @returns
 */
const coreDomainsHandler: Handler<DomainCtx<RestaurantCtx>> = async (c) => {
  const filteredIntents = globalIntents
    .concat(bookingIntents)
    .concat(deliveryIntents);

  try {
    const data = await ragService.upsertIntents(filteredIntents);
    return c.json({
      message: "Core Domain intents successfully created",
      data,
    });
  } catch (error) {
    logger.error(JSON.stringify(error));
    throw error;
  }
};

/**
 *
 * @param c
 * @param next
 * @returns
 */
const subDomainsHandler: Handler<DomainCtx<RestaurantCtx>> = async (c) => {
  const subdomain = c.req.query("subdomain") as SpecializedDomain;

  if (!subdomain) {
    throw new Error("Domain is required");
  }

  const intentsMap = new Map<SpecializedDomain, SpecializedSemanticIntent[]>([
    ["restaurant", restaurantIntents],
    ["erotic", eroticIntents],
  ]);

  try {
    const data = await ragService.upsertIntents(
      intentsMap.get(subdomain) ?? [],
    );
    return c.json({
      message: "Specialized Domain intents successfully created",
      data,
    });
  } catch (error) {
    logger.error(JSON.stringify(error));
    throw error;
  }
};

export const semanticIntent = {
  coreDomainsHandler,
  subDomainsHandler,
};
