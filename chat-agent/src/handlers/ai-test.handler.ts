import { CTX, AppContext } from "@/types/hono.types";
import { runReservationWorkflow } from "@/workflows/reservations/reservation.workflow";
import { Handler } from "hono/types";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const aiTestHandler: Handler<CTX> = async (c) => {
  const ctx = {
    RESERVATION_CACHE: c.get("RESERVATION_CACHE"),
    business: c.get("business"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    customer: c.get("customer"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
  } as AppContext;

  return c.json({
    received: true,
    text: await runReservationWorkflow(ctx),
  });
};
