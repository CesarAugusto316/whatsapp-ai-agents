import { formatForWhatsApp } from "@/helpers/format-for-whatsapp";
import whatsAppService from "@/services/whatsapp.service";
import { AppContext } from "@/types/hono.types";
import { DBOS } from "@dbos-inc/dbos-sdk";

/**
 *
 * @param appContext
 * @param childWorkflow
 * @returns
 */
async function whatsappWorkflow(
  appContext: AppContext,
  childWorkflow: (ctx: AppContext) => Promise<string>,
) {
  const args = {
    session: appContext.session,
    chatId: appContext.customerPhone,
  };

  // 1. send seen
  await DBOS.runStep(
    () => whatsAppService.sendSeen(args).then((r) => r.json()),
    {
      name: "whatsapp:sendSeen",
    },
  );

  // 2. send start typing
  await DBOS.runStep(
    () => whatsAppService.sendStartTyping(args).then((r) => r.json()),
    {
      name: "whatsapp:sendStartTyping",
    },
  );

  /**
   *  3. run child workflow
   *  This works according to the documentation
   *  @link https://docs.dbos.dev/faq#can-i-call-a-workflow-from-a-workflow (YES)
   */
  const childWorkflowResult: string = await childWorkflow(appContext);

  // 4. send stop typing
  await DBOS.runStep(
    () => whatsAppService.sendStopTyping(args).then((r) => r.json()),
    {
      name: "whatsapp:sendStopTyping",
    },
  );

  const argsWithText = {
    text: formatForWhatsApp(childWorkflowResult),
    ...args,
  };

  // 5. Send AI response to customer
  await DBOS.runStep(
    () => whatsAppService.sendText(argsWithText).then((r) => r.json()),
    {
      name: "whatsapp:sendText",
    },
  );

  return argsWithText;
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
