// @ts-nocheck
import { mockDBOS } from "../__mocks__/dobs-mock";
import { SagaOrchestrator } from "@/saga/saga-orchestrator-dbos";
import { describe, expect, test, beforeEach, jest, mock } from "bun:test";

// ---- Mock DBOS -------------------------------------------------------------
mock.module("@dbos-inc/dbos-sdk", mockDBOS);

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

    const result = await orchestrator.start("order-flow");
    // console.log({ result });
    // await expect(orchestrator.start("order-flow")).rejects.toThrow(
    //   "Sin stock disponible",
    // );
    expect(result["compensate:createOrder"]).toBeDefined();
    // Solo se debe compensar el primer paso (que sí se ejecutó)
    // expect(compensationLog.length).toEqual(3);
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
        execute: async ({ ctx, getStepResult }) => {
          const userResult = getStepResult("execute", "getUser");
          expect(userResult).toEqual({
            user: { id: "u1", email: "test@example.com" },
          });
          return { valid: true, userId: userResult.user.id };
        },
      },
      {
        name: "createOrder",
        execute: async ({ ctx, getStepResult }) => {
          const validation = getStepResult("execute", "validateOrder");
          return { orderId: `order-${validation.userId}` };
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = await orchestrator.start("order-flow");

    expect(result["execute:createOrder"]).toEqual({ orderId: "order-u1" });
  });

  test("paso con durableStep usa DBOS.runStep", async () => {
    const mockDurableOperation = jest.fn(async () => "operation-result");

    const steps = [
      {
        name: "durableOperation",
        execute: async ({ ctx, getStepResult, durableStep }) => {
          const result = await durableStep(async () => {
            return mockDurableOperation();
          });
          return { data: result };
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = await orchestrator.start("durable-flow");

    expect(result["execute:durableOperation"]).toEqual({
      data: "operation-result",
    });
    expect(mockDurableOperation).toHaveBeenCalledTimes(1);
  });

  /**
   *
   * @todo Implement retryStep with retries configuration
   */
  // test("configuración de retries se pasa correctamente", async () => {
  //   const mockStep = jest.fn();
  //   mockStep
  //     .mockRejectedValueOnce(new Error("First fail"))
  //     .mockResolvedValueOnce("success");

  //   const steps = [
  //     {
  //       name: "retryStep",
  //       config: {
  //         execute: {
  //           retriesAllowed: true,
  //           maxAttempts: 3,
  //           intervalSeconds: 1,
  //           backoffRate: 2,
  //         },
  //       },
  //       execute: async (ctx, getStepResult, durableStep) => {
  //         return await durableStep(async () => {
  //           return mockStep();
  //         });
  //       },
  //     },
  //   ];

  //   const orchestrator = new SagaOrchestrator(baseCtx, steps);
  //   const result = await orchestrator.execute("retry-flow");

  //   expect(result["execute:retryStep"]).toBe("success");
  //   expect(mockStep).toHaveBeenCalledTimes(2);
  // });

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
      await expect(
        orchestrator.start("compensation-flow"),
      ).resolves.toBeDefined();
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
    const result = await orchestrator.start("successful-flow");

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
        execute: async ({ ctx }) => {
          expect(ctx.userId).toBe("u1");
          expect(ctx.transactionId).toBe("tx123");

          expect(() => (ctx.userId = "modified")).toThrow();
          return { processed: true };
        },
      },
      {
        name: "step2",
        execute: async ({ ctx }) => {
          expect(ctx.userId).toBe("u1");
          return { processed: true };
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    await orchestrator.start("context-flow");
  });

  // Agregar después de los tests existentes

  test("paso sin compensación se ejecuta correctamente", async () => {
    const steps = [
      {
        name: "step1",
        execute: async () => ({ data: "step1" }),
        // Sin función compensate
      },
      {
        name: "step2",
        execute: async () => ({ data: "step2" }),
        // Sin función compensate
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = await orchestrator.start("no-compensation-flow");

    expect(result).toEqual({
      "execute:step1": { data: "step1" },
      "execute:step2": { data: "step2" },
    });
  });

  test("primer paso que falla no ejecuta compensación", async () => {
    const compensationLog: string[] = [];

    const steps = [
      {
        name: "step1",
        execute: async () => {
          throw new Error("Falló inmediatamente");
        },
        compensate: async () => {
          compensationLog.push("compensate-step1");
          return {};
        },
      },
      {
        name: "step2",
        execute: async () => ({ data: "step2" }),
        compensate: async () => {
          compensationLog.push("compensate-step2");
          return {};
        },
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);

    await expect(orchestrator.start("first-step-fails")).resolves.toBeDefined();

    // No debería haber ninguna compensación porque ningún paso se ejecutó exitosamente
    expect(compensationLog).toEqual([]);
  });

  test("bag acumula resultados de compensación", async () => {
    const steps = [
      {
        name: "step1",
        execute: async () => ({ original: "data1" }),
        compensate: async () => ({ compensated: true, step: "step1" }),
      },
      {
        name: "step2",
        execute: async () => {
          throw new Error("Falló step2");
        },
        compensate: async () => ({ compensated: true, step: "step2" }),
      },
    ];

    const orchestrator = new SagaOrchestrator(baseCtx, steps);
    const result = orchestrator.start("bag-accumulation");
    await expect(result).resolves.toBeDefined();

    // Accedemos al bag interno (propiedad privada) para verificar
    const bag = orchestrator.getBag();

    // El bag debería contener tanto el resultado de execute:step1 como compensate:step1
    expect(bag).toEqual({
      "execute:step1": { original: "data1" },
      "compensate:step1": { compensated: true, step: "step1" },
    });

    // Verificar que NO está el compensate:step2 (porque step2 nunca se ejecutó exitosamente)
    expect(bag["compensate:step2"]).toBeUndefined();
  });

  test("encadenamiento de addStep funciona en escenario real", async () => {
    const orchestrator = new SagaOrchestrator(baseCtx)
      .addStep({
        name: "getUser",
        execute: async () => ({ userId: "u123" }),
      })
      .addStep({
        name: "createOrder",
        execute: async ({ ctx, getStepResult }) => {
          const user = getStepResult("execute", "getUser");
          return { orderId: `order-${user.userId}` };
        },
      })
      .addStep({
        name: "sendConfirmation",
        execute: async ({ ctx, getStepResult }) => {
          const order = getStepResult("execute", "createOrder");
          return { sent: true, orderId: order.orderId };
        },
      });

    const result = await orchestrator.start("chained-flow");

    expect(result).toEqual({
      "execute:getUser": { userId: "u123" },
      "execute:createOrder": { orderId: "order-u123" },
      "execute:sendConfirmation": { sent: true, orderId: "order-u123" },
    });
  });
});
