// import { SagaOrchestrator } from "@/application/patterns/saga-orchestrator/saga-orchestrator";
// import { RestaurantCtx } from "@/domain/restaurant/context.types";
// import { ReservationMode } from "@/domain/restaurant/reservations/prompts/system-messages";
// import { FMStatus } from "@/domain/restaurant/reservations/reservation.types";

// // application/reservation/workflows/data-collection-saga.builder.ts
// export class DataCollectionSagaBuilder {
//   private constructor(
//     private readonly orchestrator: SagaOrchestrator<
//       RestaurantCtx,
//       CollectDataSagaResults,
//       CollectDataStepName
//     >
//   ) {}

//   static create(ctx: RestaurantCtx, fmStatus: FMStatus): DataCollectionSagaBuilder {
//     const orchestrator = new SagaOrchestrator<
//       RestaurantCtx,
//       CollectDataSagaResults,
//       CollectDataStepName
//     >({
//       ctx,
//       dbosConfig: { workflowName: `reservation:${fmStatus}` },
//     });

//     return new DataCollectionSagaBuilder(orchestrator);
//   }

//   withEarlyConditions(mode: ReservationMode): this {
//     this.orchestrator.addStep({
//       config: { execute: { name: "early_conditions" } },
//       execute: ({ durableStep }) =>
//         durableStep(() => this.executeEarlyConditions(mode)),
//       compensate: ({ durableStep }) =>
//         durableStep(() => this.compensateEarlyConditions()),
//     });
//     return this;
//   }

//   withDataValidation(): this {
//     this.orchestrator.addStep({
//       config: { execute: { name: "collect_and_validate" } },
//       execute: ({ durableStep, getStepResult }) =>
//         durableStep(() => this.executeDataValidation(getStepResult)),
//       compensate: ({ durableStep }) =>
//         durableStep(() => this.compensateDataValidation()),
//     });
//     return this;
//   }

//   withAvailabilityCheck(): this {
//     this.orchestrator.addStep({
//       config: { execute: { name: "check_availability" } },
//       execute: ({ durableStep, getStepResult }) =>
//         durableStep(() => this.executeAvailabilityCheck(getStepResult)),
//       compensate: ({ durableStep }) =>
//         durableStep(() => this.compensateAvailabilityCheck()),
//     });
//     return this;
//   }

//   build() {
//     return this.orchestrator;
//   }

//   // Métodos privados que implementan la lógica real
//   private async executeEarlyConditions(
//     mode: ReservationMode
//   ): Promise<CollectDataSagaResults> {
//     // Tu lógica actual de early_conditions
//   }

//   private async compensateEarlyConditions(): Promise<CollectDataSagaResults> {
//     // Compensación específica
//     return { continue: false, result: "Compensación exitosa" };
//   }
// }
