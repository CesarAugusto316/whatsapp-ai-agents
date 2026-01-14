// @ts-nocheck
import {
  ISagaStep,
  SagaOrchestrator,
} from "@/application/patterns/saga-orchestrator/saga-orchestrator";
import { WhatsappSagaTypes } from "@/application/use-cases/sagas/whatsapp.saga";
import { describe, test, expect, beforeEach, jest, mock } from "bun:test";

// Mock global de DBOS
mock.module("@dbos-inc/dbos-sdk", () => ({
  DBOS: {
    registerWorkflow: jest.fn((fn) => fn),
    startWorkflow: jest.fn((fn, args) => () => ({
      getResult: async () => {
        const result = await fn();
        return result;
      },
    })),
    runStep: jest.fn(async (fn) => {
      try {
        return await fn();
      } catch (error) {
        throw error;
      }
    }),
    retryStep: jest.fn(
      async (
        fn,
        { retriesAllowed = true, maxAttempts = 3, intervalSeconds = 1 },
      ) => {
        try {
          return await fn();
        } catch (error) {
          throw error;
        }
      },
    ),
  },
  StepConfig: {},
}));

// Tipos para testing
interface TestContext {
  userId: string;
  transactionId: string;
}

interface TestResults {
  userCreated: boolean;
  paymentProcessed: boolean;
  notificationSent: boolean;
  compensated: boolean;
  error?: string;
}

type TestStepName = "createUser" | "processPayment" | "sendNotification";

// Helper para crear steps exitosos
const createSuccessStep = (
  name: TestStepName,
  result: Partial<TestResults>,
): ISagaStep<TestContext, TestResults, TestStepName> => ({
  config: {
    execute: { name, retriesAllowed: true, maxAttempts: 3, intervalSeconds: 1 },
  },
  execute: async ({ ctx, durableStep }) => {
    await durableStep(async () => {});
    return result as TestResults;
  },
});

// Helper para crear steps que fallan
const createFailingStep = (
  name: TestStepName,
): ISagaStep<TestContext, TestResults, TestStepName> => ({
  config: {
    execute: { name, retriesAllowed: true, maxAttempts: 2, intervalSeconds: 1 },
  },
  execute: async ({ ctx, durableStep }) => {
    return await durableStep(async () => {
      throw new Error(`Step ${name} failed`);
    });
  },
});

// Helper para crear steps con compensación
const createStepWithCompensation = (
  name: TestStepName,
): ISagaStep<TestContext, TestResults, TestStepName> => ({
  config: {
    execute: { name, retriesAllowed: true, maxAttempts: 3, intervalSeconds: 1 },
    compensate: {
      name: `compensate${name}`,
      retriesAllowed: true,
      maxAttempts: 3,
      intervalSeconds: 1,
    },
  },
  execute: async ({ ctx, durableStep }) => {
    await durableStep(async () => {});
    return { [`${name}Done`]: true } as TestResults;
  },
  compensate: async ({ ctx, durableStep }) => {
    await durableStep(async () => {});
    return { compensated: true } as TestResults;
  },
});

describe("SagaOrchestrator - Casos Críticos", () => {
  const baseContext: TestContext = {
    userId: "user-123",
    transactionId: "txn-456",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CASO 1: Flujo exitoso sin DBOS (el más común)
  test("debe ejecutar todos los pasos exitosamente sin DBOS", async () => {
    const orchestrator = new SagaOrchestrator<
      WhatsappSagaTypes["Ctx"],
      WhatsappSagaTypes["Result"],
      WhatsappSagaTypes["Key"]
    >({
      ctx: baseContext,
    });

    const step1 = createSuccessStep("createUser", { userCreated: true });
    const step2 = createSuccessStep("processPayment", {
      paymentProcessed: true,
    });
    const step3 = createSuccessStep("sendNotification", {
      notificationSent: true,
    });

    orchestrator.addStep(step1).addStep(step2).addStep(step3);

    const result = await orchestrator.start();

    expect(result).toBeDefined();
    expect(result["execute:createUser"]?.userCreated).toBe(true);
    expect(result["execute:processPayment"]?.paymentProcessed).toBe(true);
    expect(result["execute:sendNotification"]?.notificationSent).toBe(true);
  });

  // CASO 2: Error en un paso con compensación - AHORA RESUELVE, NO RECHAZA
  test("debe compensar pasos ejecutados cuando un paso falla", async () => {
    const orchestrator = new SagaOrchestrator<
      WhatsappSagaTypes["Ctx"],
      WhatsappSagaTypes["Result"],
      WhatsappSagaTypes["Key"]
    >({
      ctx: baseContext,
    });

    // Paso con compensación
    const step1 = createStepWithCompensation("createUser");
    // Paso que falla
    const step2 = createFailingStep("processPayment");
    // Este paso no debería ejecutarse porque step2 falla
    const step3 = createSuccessStep("sendNotification", {
      notificationSent: true,
    });

    orchestrator.addStep(step1).addStep(step2).addStep(step3);

    // IMPORTANTE: Ahora resuelve, no rechaza
    const bag = await orchestrator.start();

    // Verificar que se ejecutó el primer paso
    expect(bag["execute:createUser"]).toBeDefined();
    // Verificar que se ejecutó la compensación del primer paso
    expect(bag["compensate:compensatecreateUser"]).toBeDefined();
    // El segundo paso falló, no debería tener resultado en execute
    expect(bag["execute:processPayment"]).toBeUndefined();

    // El segundo paso falló, debería tener resultado en compensate pero no tiene compensate asi que deberia ser undefined
    expect(bag["compensate:processPayment"]).toBeUndefined();

    // El tercer paso no se ejecutó porque el segundo falló
    expect(bag["execute:sendNotification"]).toBeUndefined();
  });

  // CASO 3: Flujo con DBOS
  test("debe registrar workflow cuando se proporciona dbosConfig", async () => {
    const { DBOS } = await import("@dbos-inc/dbos-sdk");

    const orchestrator = new SagaOrchestrator<
      WhatsappSagaTypes["Ctx"],
      WhatsappSagaTypes["Result"],
      WhatsappSagaTypes["Key"]
    >({
      ctx: baseContext,
      dbosConfig: {
        workflowName: "test-workflow",
        args: { workflowID: "test-123" },
      },
    });

    orchestrator
      .addStep(createSuccessStep("createUser", { userCreated: true }))
      .addStep(createSuccessStep("processPayment", { paymentProcessed: true }));

    const result = await orchestrator.start();

    // Verificar que se llamaron los métodos de DBOS
    expect(DBOS.registerWorkflow).toHaveBeenCalled();
    expect(DBOS.startWorkflow).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  // CASO 4: getStepResult funciona correctamente
  test("debe permitir obtener resultados de pasos anteriores", async () => {
    const orchestrator = new SagaOrchestrator<
      WhatsappSagaTypes["Ctx"],
      WhatsappSagaTypes["Result"],
      WhatsappSagaTypes["Key"]
    >({
      ctx: baseContext,
    });

    const step1 = {
      config: {
        execute: { name: "createUser", retriesAllowed: true, maxAttempts: 3 },
      },
      execute: async ({ ctx, durableStep }) => {
        await durableStep(async () => {});
        return { userCreated: true, userId: ctx.userId } as TestResults;
      },
    };

    const step2 = {
      config: {
        execute: {
          name: "usePreviousResult",
          retriesAllowed: true,
          maxAttempts: 3,
        },
      },
      execute: async ({ ctx, getStepResult, durableStep }) => {
        const previousResult = getStepResult("execute", "createUser");
        expect(previousResult?.userCreated).toBe(true);

        await durableStep(async () => {});
        return { paymentProcessed: true } as TestResults;
      },
    };

    orchestrator.addStep(step1).addStep(step2);

    const result = await orchestrator.start();
    expect(result["execute:usePreviousResult"]?.paymentProcessed).toBe(true);
  });

  // CASO 5: Contexto inmutable
  test("debe mantener el contexto inmutable", async () => {
    const originalContext = { ...baseContext, sensitiveData: "do-not-change" };

    const orchestrator = new SagaOrchestrator<
      WhatsappSagaTypes["Ctx"],
      WhatsappSagaTypes["Result"],
      WhatsappSagaTypes["Key"]
    >({
      ctx: originalContext,
    });

    const step = {
      config: {
        execute: { name: "testStep", retriesAllowed: true, maxAttempts: 3 },
      },
      execute: async ({ ctx, durableStep }) => {
        // El contexto es de solo lectura, no deberíamos poder modificarlo
        // TypeScript nos dará error si intentamos asignar a una propiedad de solo lectura
        await durableStep(async () => {});
        return {} as TestResults;
      },
    };

    orchestrator.addStep(step);
    await orchestrator.start();

    // El contexto original no debe cambiar
    expect(originalContext.userId).toBe("user-123");
  });

  // CASO 6: Orden de compensación inverso - AHORA RESUELVE, NO RECHAZA
  test("debe compensar en orden inverso al de ejecución", async () => {
    const compensations: string[] = [];

    const orchestrator = new SagaOrchestrator<
      WhatsappSagaTypes["Ctx"],
      WhatsappSagaTypes["Result"],
      WhatsappSagaTypes["Key"]
    >({
      ctx: baseContext,
    });

    // Crear 3 pasos con compensación
    for (let i = 1; i <= 3; i++) {
      const stepName = `step${i}`;
      const step = {
        config: {
          execute: { name: stepName, retriesAllowed: true, maxAttempts: 3 },
          compensate: {
            name: stepName,
            retriesAllowed: true,
            maxAttempts: 3,
          },
        },
        execute: async ({ ctx, durableStep }) => {
          await durableStep(async () => {});
          return { [`${stepName}Done`]: true };
        },
        compensate: async ({ ctx, durableStep }) => {
          compensations.push(stepName);
          await durableStep(async () => {});
          return { [`${stepName}Compensated`]: true };
        },
      };
      orchestrator.addStep(step);
    }

    // Agregar un paso que falle para activar compensaciones
    orchestrator.addStep(createFailingStep("failingStep" as TestStepName));

    // IMPORTANTE: Ahora resuelve, no rechaza
    const bag = await orchestrator.start();

    // Las compensaciones deben ejecutarse en orden inverso: step3, step2, step1
    expect(compensations).toEqual(["step3", "step2", "step1"]);

    // Verificar que los pasos se ejecutaron
    expect(bag["execute:step1"]).toBeDefined();
    expect(bag["execute:step2"]).toBeDefined();
    expect(bag["execute:step3"]).toBeDefined();
    // Verificar que se compensaron
    expect(bag["compensate:step1"]).toBeDefined();
    expect(bag["compensate:step2"]).toBeDefined();
    expect(bag["compensate:step3"]).toBeDefined();
  });
});

// Test adicional: Verificar que el bag se llena correctamente
test("el bag debe contener resultados de execute y compensate", async () => {
  const orchestrator = new SagaOrchestrator<
    TestContext,
    TestResults,
    TestStepName
  >({
    ctx: { userId: "test", transactionId: "123" },
  });

  const stepWithCompensation = {
    config: {
      execute: { name: "testStep", retriesAllowed: true, maxAttempts: 3 },
      compensate: {
        name: "compensateTestStep",
        retriesAllowed: true,
        maxAttempts: 3,
      },
    },
    execute: async ({ ctx, durableStep }) => {
      await durableStep(async () => {});
      return { userCreated: true } as TestResults;
    },
    compensate: async ({ ctx, durableStep }) => {
      await durableStep(async () => {});
      return { compensated: true } as TestResults;
    },
  };

  const failingStep = createFailingStep("failingStep" as TestStepName);

  orchestrator.addStep(stepWithCompensation).addStep(failingStep);

  const bag = await orchestrator.start();

  // Debe tener el resultado del execute
  expect(bag["execute:testStep"]?.userCreated).toBe(true);
  // Debe tener el resultado del compensate
  expect(bag["compensate:compensateTestStep"]?.compensated).toBe(true);
  // No debe tener resultado del paso que falló
  expect(bag["execute:failingStep"]).toBeUndefined();
});

// Tests de integración para tu caso de uso específico
describe("WhatsappSaga - Casos Reales", () => {
  // Mock del logger para evitar errores
  mock.module("@/middlewares/logger-middleware", () => ({
    logger: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  }));

  // Mock del helper de formateo
  mock.module("@/helpers/format-for-whatsapp", () => ({
    formatForWhatsApp: jest.fn((text) => text), // Simplemente devuelve el texto tal cual
  }));

  beforeEach(() => {
    jest.clearAllMocks();

    // Resetear mocks antes de cada test
    mock.module("@/services/whatsapp.service", () => ({
      default: {
        sendSeen: jest.fn().mockResolvedValue({
          json: () => Promise.resolve({ ok: true, text: "seen" }),
        }),
        sendStartTyping: jest.fn().mockResolvedValue({
          json: () => Promise.resolve({ ok: true, text: "typing started" }),
        }),
        sendStopTyping: jest.fn().mockResolvedValue({
          json: () => Promise.resolve({ ok: true, text: "typing stopped" }),
        }),
        sendText: jest.fn().mockResolvedValue({
          json: () => Promise.resolve({ ok: true, text: "message sent" }),
        }),
      },
    }));
  });

  test("debe ejecutar flujo completo de whatsapp exitosamente", async () => {
    // Mock exitoso del workflow de reservación
    mock.module("@/workflows/reservations/reservation.workflow", () => ({
      reservationWorkflow: jest
        .fn()
        .mockResolvedValue("Reservation successful"),
      runReservationWorkflow: jest
        .fn()
        .mockResolvedValue("Reservation successful"),
    }));

    // Importar después de configurar los mocks
    const {
      sendSeen,
      sendStartTyping,
      sendStopTyping,
      sendText,
      reservationWorklow,
    } = await import("@/application/use-cases/sagas/whatsapp.saga");

    const ctx = {
      session: "test-session",
      customerPhone: "+1234567890",
      whatsappEvent: "message",
    };

    const orchestrator = new SagaOrchestrator<any, any, any>({
      ctx,
      dbosConfig: {
        workflowName: "whatsapp-test",
        args: { workflowID: "test-chat" },
      },
    });

    orchestrator
      .addStep(sendSeen)
      .addStep(sendStartTyping)
      .addStep(reservationWorklow)
      .addStep(sendStopTyping)
      .addStep(sendText);

    const result = await orchestrator.start();

    // Obtener el mock actualizado
    const { default: mockWhatsappService } =
      await import("@/infraestructure/http/whatsapp/whatsapp.client");

    expect(mockWhatsappService.sendSeen).toHaveBeenCalled();
    expect(mockWhatsappService.sendStartTyping).toHaveBeenCalled();
    expect(mockWhatsappService.sendStopTyping).toHaveBeenCalled();
    expect(mockWhatsappService.sendText).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  // CASO MODIFICADO: Ahora resuelve, no rechaza
  test("debe compensar typing si falla el flujo de reservación", async () => {
    // Mockear el workflow de reservación para que falle
    mock.module("@/", () => ({
      reservationWorkflow: jest
        .fn()
        .mockRejectedValue(new Error("Reservation failed")),
      runReservationWorkflow: jest
        .fn()
        .mockRejectedValue(new Error("Reservation failed")),
    }));

    // Importar después de configurar los mocks
    const { sendSeen, sendStartTyping, reservationWorklow } =
      await import("@/application/use-cases/sagas/whatsapp.saga");

    const ctx = {
      session: "test-session",
      customerPhone: "+1234567890",
      whatsappEvent: "message",
    };

    const orchestrator = new SagaOrchestrator<any, any, any>({
      ctx,
    });

    orchestrator
      .addStep(sendSeen)
      .addStep(sendStartTyping)
      .addStep(reservationWorklow);

    // IMPORTANTE: Ahora resuelve, no rechaza
    const bag = await orchestrator.start();

    // Obtener el mock actualizado
    const { default: mockWhatsappService } =
      await import("@/infraestructure/http/whatsapp/whatsapp.client");

    // Verificar que sendSeen se ejecutó
    expect(mockWhatsappService.sendSeen).toHaveBeenCalled();

    // Verificar que sendStartTyping se ejecutó
    expect(mockWhatsappService.sendStartTyping).toHaveBeenCalled();

    // Verificar que sendStartTyping se compensó (sendStopTyping se llamó)
    // NOTA: La compensación de sendStartTyping es sendStopTyping
    // Pero en tu código, el compensator se llama automáticamente cuando falla reservationWorklow
    // Asegúrate de que tu step sendStartTyping tiene un compensator configurado
    expect(mockWhatsappService.sendStopTyping).toHaveBeenCalled();
  });
});

// Test adicional: Verificar que el bag se llena correctamente
test("el bag debe contener resultados de execute y compensate", async () => {
  const orchestrator = new SagaOrchestrator<
    TestContext,
    TestResults,
    TestStepName
  >({
    ctx: { userId: "test", transactionId: "123" },
  });

  const stepWithCompensation = {
    config: {
      execute: { name: "testStep", retriesAllowed: true, maxAttempts: 3 },
      compensate: {
        name: "compensateTestStep",
        retriesAllowed: true,
        maxAttempts: 3,
      },
    },
    execute: async ({ ctx, durableStep }) => {
      await durableStep(async () => {});
      return { userCreated: true } as TestResults;
    },
    compensate: async ({ ctx, durableStep }) => {
      await durableStep(async () => {});
      return { compensated: true } as TestResults;
    },
  };

  const failingStep = createFailingStep("failingStep" as TestStepName);

  orchestrator.addStep(stepWithCompensation).addStep(failingStep);

  const bag = await orchestrator.start();

  // Debe tener el resultado del execute
  expect(bag["execute:testStep"]?.userCreated).toBe(true);
  // Debe tener el resultado del compensate
  expect(bag["compensate:compensateTestStep"]?.compensated).toBe(true);
  // No debe tener resultado del paso que falló
  expect(bag["execute:failingStep"]).toBeUndefined();
});
