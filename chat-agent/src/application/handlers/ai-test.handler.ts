import { Handler } from "hono/types";
import { reservationWorkflow } from "../use-cases/workflows/reservations/reservation.workflow";
import { ReservationCtx } from "@/domain/restaurant/context.types";
import { DomainCtx } from "@/domain/context.types";

/**
 *
 * @param c
 * @param next
 * @returns
 */
export const aiTestHandler: Handler<DomainCtx<ReservationCtx>> = async (c) => {
  const context = {
    RESERVATION_CACHE: c.get("RESERVATION_CACHE"),
    business: c.get("business"),
    customerMessage: c.get("customerMessage"),
    customerPhone: c.get("customerPhone"),
    customer: c.get("customer"),
    chatKey: c.get("chatKey"),
    reservationKey: c.get("reservationKey"),
  } as ReservationCtx;

  return c.json({
    received: true,
    text: await reservationWorkflow(context),
  });
};
