// import { AppContext } from "@/types/hono.types";
// import { SagaStep } from "./saga-orchestrator";
// import whatsappService from "@/services/whatsapp.service";

// export const steps: SagaStep<AppContext>[] = [
//   {
//     async execute(ctx, bag) {
//       const args = {
//         session: ctx.session,
//         chatId: ctx.customerPhone,
//       };
//       return whatsappService.sendSeen(args).then((r) => r.json());
//     },
//   },
// ];
