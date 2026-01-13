import { formatForWhatsApp } from "@/helpers/format-for-whatsapp";
import { logger } from "@/middlewares/logger-middleware";
import whatsAppService from "@/services/whatsapp.service";
import { AppContext } from "@/types/hono.types";
import { DBOS, StepConfig } from "@dbos-inc/dbos-sdk";
import { runReservationWorkflow } from "../reservations/reservation.workflow";

const stepConfig = {
  retriesAllowed: true,
  maxAttempts: 5,
  intervalSeconds: 2,
  backoffRate: 2,
} satisfies StepConfig;

/**
 *
 * @param ctx
 * @param childWorkflow
 * @returns
 */
async function whatsappWorkflow(ctx: AppContext) {
  const args = {
    session: ctx.session,
    chatId: ctx.customerPhone,
  };
  // 1. send seen
  await DBOS.runStep(
    () => whatsAppService.sendSeen(args).then((r) => r.json()),
    {
      name: "whatsapp:sendSeen",
      ...stepConfig,
    },
  );

  // Paso 2: iniciar typing (compensación: enviar stopTyping si falla después)
  let typingSent = false;
  try {
    // 2. send start typing
    await DBOS.runStep(
      () => whatsAppService.sendStartTyping(args).then((r) => r.json()),
      {
        name: "whatsapp:sendStartTyping",
        ...stepConfig,
      },
    );
    typingSent = true;

    /**
     *  3. run child workflow
     *  This works according to the documentation
     *  @link https://docs.dbos.dev/faq#can-i-call-a-workflow-from-a-workflow (YES)
     */
    const wResult: string = await runReservationWorkflow(ctx);

    // must be the output from childWorkflow
    // if (reservationMade === true) {
    //   await DBOS.sleep(4444);
    //   // 1.  whastapp workflow
    //   // 2. send schedule notification 24h before reservation
    // }

    // 4. send stop typing
    await DBOS.runStep(
      () => whatsAppService.sendStopTyping(args).then((r) => r.json()),
      {
        name: "whatsapp:sendStopTyping",
        ...stepConfig,
      },
    );

    const argsWithText = {
      text: formatForWhatsApp(wResult),
      ...args,
    };

    // 5. Send AI response to customer
    await DBOS.runStep(
      () => whatsAppService.sendText(argsWithText).then((r) => r.json()),
      {
        name: "whatsapp:sendText",
        ...stepConfig,
      },
    );

    logger.info("✅ Whatsapp workflow completed");
    return argsWithText;
  } catch (error) {
    // Compensación: si se envió typing pero falló algo después, asegurar que se detenga
    if (typingSent) {
      logger.info("whatsapp:compensateStopTyping", { error });

      await DBOS.runStep(() => whatsAppService.sendStopTyping(args), {
        name: "whatsapp:compensateStopTyping",
        ...stepConfig,
      });
    }
    logger.error("❌ Whatsapp workflow failed", error as Error);
    throw error; // DBOS reintentará el flujo desde el último checkpoint
  }
}

/**
 *
 * @param appContext
 * @param childWorkflow
 * @returns
 */
export const runWhatsappWorkflow = DBOS.registerWorkflow(whatsappWorkflow, {
  name: "whatsapp",
});
