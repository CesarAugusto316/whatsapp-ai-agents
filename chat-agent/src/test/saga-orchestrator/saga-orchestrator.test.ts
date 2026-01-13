import { mockDBOS } from "../__mocks__/dobs-mock";
import { describe, expect, test, beforeEach, mock, jest } from "bun:test";
import { SagaOrchestrator, SagaStep } from "@/saga/saga-orchestrator-dbos";
import * as dbosSdk from "@dbos-inc/dbos-sdk";

// ---- Mock DBOS -------------------------------------------------------------
mock.module("@dbos-inc/dbos-sdk", mockDBOS);

describe("SagaOrchestrator basic mock sanity", () => {
  const ctx = { userId: "u1" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("ejecuta un solo paso y propaga runStep", async () => {
    const step: SagaStep<typeof ctx, {}> = {
      name: "ping",
      execute: async (_ctx, _get, durableStep) => {
        const res = await durableStep(async () => "pong");
        return { ok: res };
      },
    };

    const orchestrator = new SagaOrchestrator(ctx, [step]);

    const result = await orchestrator.start("test-wf");

    expect(result["execute:ping"]).toEqual({ ok: "pong" });
    expect(dbosSdk.DBOS.registerWorkflow).toHaveBeenCalledTimes(1);
    expect(dbosSdk.DBOS.runStep).toHaveBeenCalledTimes(1);
  });

  test("addStep agrega pasos únicos", async () => {
    const orchestrator = new SagaOrchestrator(ctx);

    orchestrator.addStep({
      name: "first",
      execute: async () => ({ a: 1 }),
    });

    orchestrator.addStep({
      name: "second",
      execute: async () => ({ b: 2 }),
    });

    const result = await orchestrator.start("wf2");

    expect(result["execute:first"]).toEqual({ a: 1 });
    expect(result["execute:second"]).toEqual({ b: 2 });
    expect(dbosSdk.DBOS.runStep).toHaveBeenCalledTimes(0);

    orchestrator.addStep({
      name: "third",
      execute: async (_ctx, _get, durableStep) =>
        durableStep(async () => ({ a: 1 })),
    });

    await orchestrator.start("wf3");
    expect(dbosSdk.DBOS.runStep).toHaveBeenCalledTimes(1);
  });

  test("lanza error si repites nombre de paso", () => {
    const orchestrator = new SagaOrchestrator(ctx);

    orchestrator.addStep({
      name: "dup",
      execute: async () => ({}),
    });

    expect(() =>
      orchestrator.addStep({
        name: "dup",
        execute: async () => ({}),
      }),
    ).toThrow("Step with name 'dup' already exists");
  });
});
