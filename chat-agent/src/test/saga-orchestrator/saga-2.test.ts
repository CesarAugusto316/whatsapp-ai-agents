// @ts-nocheck
import { SagaOrchestrator } from "@/saga/saga-orchestrator-dbos";
import { describe, expect, test, beforeEach, jest, mock } from "bun:test";

// ---- Mock DBOS -------------------------------------------------------------
mock.module("@dbos-inc/dbos-sdk", () => ({
  DBOS: {
    registerWorkflow: jest.fn((fn) => {
      // fn es el workflow
      return (...args: unknown[]) => fn(...args);
    }),
    runStep: jest.fn(async (fn) => fn()),
    workflowID: "mock-workflow",
    setEvent: jest.fn(),
    recv: jest.fn(),
    startWorkflow: jest.fn(),
  },
}));

describe("SagaOrchestrator real-world scenarios", () => {
  const baseCtx = { userId: "u1", transactionId: "tx123" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("compensación automática cuando falla un paso intermedio", async () => {
    const compensationLog: string[] = [];

    const steps = [
      {
        name: "createOrder",
        execute: async () => ({ orderId: "order-1" }),
        compensate: async () => {
          compensationLog.push("compensate-createOrder");
          return { rolledBack: true };
        },
      },
      {
        name: "reserveInventory",
        execute: async () => {
          throw new Error("Sin stock disponible");
        },
        compensate: async () => {
          compensationLog.push("compensate-reserveInventory");
          return { released: true };
        },
      },
      {
        name: "processPayment",
        execute: async () => ({ paymentId: "pay-1" }),
        compensate: async () => {
          compensationLog.push("compensate-processPayment");
          return { refunded: true };
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);

    await expect(orchestrator.execute("order-flow")).rejects.toThrow(
      "Sin stock disponible",
    );

    // Solo se debe compensar el primer paso (que sí se ejecutó)
    expect(compensationLog).toEqual(["compensate-createOrder"]);
  });

  test("usar resultados de pasos anteriores con getStepResult", async () => {
    const steps = [
      {
        name: "getUser",
        execute: async () => ({
          user: { id: "u1", email: "test@example.com" },
        }),
      },
      {
        name: "validateOrder",
        execute: async (ctx, getStepResult) => {
          const userResult = getStepResult("execute", "getUser");
          expect(userResult).toEqual({
            user: { id: "u1", email: "test@example.com" },
          });
          return { valid: true, userId: userResult.user.id };
        },
      },
      {
        name: "createOrder",
        execute: async (ctx, getStepResult) => {
          const validation = getStepResult("execute", "validateOrder");
          return { orderId: `order-${validation.userId}` };
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = await orchestrator.execute("order-flow");

    expect(result["execute:createOrder"]).toEqual({ orderId: "order-u1" });
  });

  test("paso con durableStep usa DBOS.runStep", async () => {
    const mockDurableOperation = jest.fn(async () => "operation-result");

    const steps = [
      {
        name: "durableOperation",
        execute: async (ctx, getStepResult, durableStep) => {
          const result = await durableStep(async () => {
            return mockDurableOperation();
          });
          return { data: result };
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = await orchestrator.execute("durable-flow");

    expect(result["execute:durableOperation"]).toEqual({
      data: "operation-result",
    });
    expect(mockDurableOperation).toHaveBeenCalledTimes(1);
  });

  test("configuración de retries se pasa correctamente", async () => {
    const mockStep = jest.fn();
    mockStep
      .mockRejectedValueOnce(new Error("First fail"))
      .mockResolvedValueOnce("success");

    const steps = [
      {
        name: "retryStep",
        config: {
          execute: {
            retriesAllowed: true,
            maxAttempts: 3,
            intervalSeconds: 1,
            backoffRate: 2,
          },
        },
        execute: async (ctx, getStepResult, durableStep) => {
          return await durableStep(async () => {
            return mockStep();
          });
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = await orchestrator.execute("retry-flow");

    expect(result["execute:retryStep"]).toBe("success");
    expect(mockStep).toHaveBeenCalledTimes(2);
  });

  test("compensación con errores continúa compensando otros pasos", async () => {
    const compensationLog: string[] = [];
    const errorLog: any[] = [];

    const originalError = console.error;
    console.error = (...args) => {
      errorLog.push(args);
    };

    try {
      const steps = [
        {
          name: "step1",
          execute: async () => ({ data: "step1" }),
          compensate: async () => {
            compensationLog.push("compensate-step1");
            return { ok: true };
          },
        },
        {
          name: "step2",
          execute: async () => ({ data: "step2" }),
          compensate: async () => {
            compensationLog.push("compensate-step2");
            throw new Error("Failed to compensate step2");
          },
        },
        {
          name: "step3",
          execute: async () => {
            throw new Error("Execution failed");
          },
          compensate: async () => {
            compensationLog.push("compensate-step3");
            return { ok: true };
          },
        },
      ];

      const orchestrator = new SagaOrchestrator(baseCtx, steps);
      await expect(orchestrator.execute("compensation-flow")).rejects.toThrow(
        "Execution failed",
      );

      // Debe intentar compensar ambos pasos anteriores
      expect(compensationLog).toEqual(["compensate-step2", "compensate-step1"]);
      expect(errorLog.length).toBeGreaterThan(0);
    } finally {
      console.error = originalError;
    }
  });

  test("saga exitosa retorna todos los resultados en bag", async () => {
    const steps = [
      {
        name: "step1",
        execute: async () => ({ result: 1 }),
      },
      {
        name: "step2",
        execute: async () => ({ result: 2 }),
      },
      {
        name: "step3",
        execute: async () => ({ result: 3 }),
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = await orchestrator.execute("successful-flow");

    expect(result).toEqual({
      "execute:step1": { result: 1 },
      "execute:step2": { result: 2 },
      "execute:step3": { result: 3 },
    });
  });

  test("contexto es inmutable y disponible para todos los pasos", async () => {
    const steps = [
      {
        name: "step1",
        execute: async (ctx) => {
          expect(ctx.userId).toBe("u1");
          expect(ctx.transactionId).toBe("tx123");

          expect(() => (ctx.userId = "modified")).toThrow();
          return { processed: true };
        },
      },
      {
        name: "step2",
        execute: async (ctx) => {
          expect(ctx.userId).toBe("u1");
          return { processed: true };
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    await orchestrator.execute("context-flow");
  });
});
