// import { mockDBOS } from "../__mocks__/dobs-mock";
// import { describe, expect, test, beforeEach, mock, jest } from "bun:test";
// import { SagaOrchestrator, ISagaStep } from "@/saga/saga-orchestrator-dbos";
// import * as dbosSdk from "@dbos-inc/dbos-sdk";

// // ---- Mock DBOS -------------------------------------------------------------
// mock.module("@dbos-inc/dbos-sdk", mockDBOS);

// describe("SagaOrchestrator basic mock sanity", () => {
//   const ctx = { userId: "u1" };

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   test("ejecuta un solo paso y propaga runStep", async () => {
//     const step: ISagaStep<typeof ctx, { ok: string }, "ping"> = {
//       config: {
//         execute: { name: "ping" },
//       },
//       execute: async ({ durableStep }) => {
//         const res = await durableStep(async () => "pong");
//         return { ok: res };
//       },
//     };

//     const orchestrator = new SagaOrchestrator({ ctx, steps: [step] });
//     const result = await orchestrator.start();

//     expect(result["execute:ping"]).toEqual({ ok: "pong" });
//     expect(dbosSdk.DBOS.registerWorkflow).toHaveBeenCalledTimes(0); // No usa workflow
//     expect(dbosSdk.DBOS.runStep).toHaveBeenCalledTimes(1);
//   });

//   test("addStep agrega pasos únicos", async () => {
//     const orchestrator = new SagaOrchestrator({ ctx });

//     orchestrator.addStep({
//       config: { execute: { name: "first" } },
//       execute: async () => ({ a: 1 }),
//     });

//     orchestrator.addStep({
//       config: { execute: { name: "second" } },
//       execute: async () => ({ b: 2 }),
//     });

//     const result = await orchestrator.start();

//     expect(result["execute:first"]).toEqual({ a: 1 });
//     expect(result["execute:second"]).toEqual({ b: 2 });
//     expect(dbosSdk.DBOS.runStep).toHaveBeenCalledTimes(0);

//     orchestrator.addStep({
//       config: { execute: { name: "third" } },
//       execute: async ({ durableStep }) => durableStep(async () => ({ a: 1 })),
//     });

//     await orchestrator.start();
//     expect(dbosSdk.DBOS.runStep).toHaveBeenCalledTimes(1);
//   });

//   test("lanza error si repites nombre de paso", () => {
//     const orchestrator = new SagaOrchestrator({ ctx });

//     orchestrator.addStep({
//       config: { execute: { name: "dup" } },
//       execute: async () => ({}),
//     });

//     expect(() =>
//       orchestrator.addStep({
//         config: { execute: { name: "dup" } },
//         execute: async () => ({}),
//       }),
//     ).toThrow("Step with name 'dup' already exists");
//   });
// });
