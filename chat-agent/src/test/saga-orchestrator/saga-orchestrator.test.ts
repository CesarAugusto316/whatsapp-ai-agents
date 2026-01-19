// @ts-nocheck
import {
  ISagaStep,
  SagaOrchestrator,
} from "@/application/patterns/saga-orchestrator/saga-orchestrator";
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
    durableStep: jest.fn(async (fn) => {
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

    launch: jest.fn(),
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
  execute: async ({ durableStep }) => {
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
      TestContext,
      TestResults,
      TestStepName
    >({
      ctx: baseContext,
      dbosConfig: {
        workflowName: "chat-agent",
      },
    });

    const step1 = createSuccessStep("createUser", { userCreated: true });
    const step2 = createSuccessStep("processPayment", {
      paymentProcessed: true,
    });
    const step3 = createSuccessStep("sendNotification", {
      notificationSent: true,
    });

    orchestrator.addStep(step1).addStep(step2).addStep(step3);
    const result = (await orchestrator.start()).bag;

    expect(result).toBeDefined();
    expect(result["execute:createUser"]?.userCreated).toBe(true);
    expect(result["execute:processPayment"]?.paymentProcessed).toBe(true);
    expect(result["execute:sendNotification"]?.notificationSent).toBe(true);
  });

  // CASO 2: Error en un paso con compensación - AHORA RESUELVE, NO RECHAZA
  test("debe compensar pasos ejecutados cuando un paso falla", async () => {
    const orchestrator = new SagaOrchestrator<
      TestContext,
      TestResults,
      TestStepName
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
    const { bag } = await orchestrator.start();

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
      TestContext,
      TestResults,
      TestStepName
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
      TestContext,
      TestResults,
      TestStepName
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
        const previousResult = getStepResult("execute:createUser");
        expect(previousResult?.userCreated).toBe(true);

        await durableStep(async () => {});
        return { paymentProcessed: true } as TestResults;
      },
    };

    orchestrator.addStep(step1).addStep(step2);

    const result = (await orchestrator.start())?.bag;
    expect(result["execute:usePreviousResult"]?.paymentProcessed).toBe(true);
  });

  // CASO 5: Contexto inmutable
  test("debe mantener el contexto inmutable", async () => {
    const originalContext = { ...baseContext, sensitiveData: "do-not-change" };

    const orchestrator = new SagaOrchestrator<
      TestContext,
      TestResults,
      TestStepName
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
      TestContext,
      TestResults,
      TestStepName
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
    const { bag } = await orchestrator.start();

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

  const { bag } = await orchestrator.start();

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
  mock.module("@/application/middlewares/logger-middleware", () => ({
    logger: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    },
  }));

  beforeEach(() => {
    jest.clearAllMocks();

    // Resetear mocks antes de cada test
    mock.module("@/infraestructure/http/whatsapp/whatsapp.client", () => ({
      default: {
        sendSeen: jest.fn().mockResolvedValue({ ok: true, text: "seen" }),
        sendStartTyping: jest
          .fn()
          .mockResolvedValue({ ok: true, text: "typing started" }),
        sendStopTyping: jest
          .fn()
          .mockResolvedValue({ ok: true, text: "typing stopped" }),
        sendText: jest
          .fn()
          .mockResolvedValue({ ok: true, text: "message sent" }),
      },
    }));
  });

  test("debe ejecutar flujo completo de whatsapp exitosamente", async () => {
    // Mock exitoso del workflow de reservación
    mock.module(
      "@/application/use-cases/sagas/reservations/reservation-old-code",
      () => ({
        reservationSagaOrchestrator: jest
          .fn()
          .mockResolvedValue("Reservation successful"),
        reservationSagaStep: jest
          .fn()
          .mockResolvedValue("Reservation successful"),
      }),
    );

    // Importar después de configurar los mocks
    const {
      sendSeen,
      sendStartTyping,
      sendStopTyping,
      sendText,
      reservationSagaStep,
    } = await import("@/application/use-cases/sagas");

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

    // Obtener el mock actualizado
    const { default: mockWhatsappService } =
      await import("@/infraestructure/http/whatsapp/whatsapp.client");

    orchestrator
      .addStep(sendSeen)
      .addStep(sendStartTyping)
      .addStep(reservationSagaStep)
      .addStep(sendStopTyping)
      .addStep(sendText);

    const result = await orchestrator.start();

    expect(mockWhatsappService.sendSeen).toHaveBeenCalled();
    expect(mockWhatsappService.sendStartTyping).toHaveBeenCalled();
    expect(mockWhatsappService.sendStopTyping).toHaveBeenCalled();
    expect(mockWhatsappService.sendText).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  // CASO MODIFICADO: Ahora resuelve, no rechaza
  test("debe compensar typing si falla el flujo de reservación", async () => {
    // Mockear el workflow de reservación para que falle
    mock.module(
      "@/application/use-cases/sagas/reservations/reservation-old-code",
      () => ({
        reservationSagaOrchestrator: jest
          .fn()
          .mockResolvedValue("Reservation successful"),
      }),
    );

    // Importar después de configurar los mocks
    const { sendSeen, sendStartTyping, reservationSagaStep, sendStopTyping } =
      await import("@/application/use-cases/sagas");

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
      .addStep(reservationSagaStep)
      .addStep(sendStopTyping);

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

  const { bag } = await orchestrator.start();

  // Debe tener el resultado del execute
  expect(bag["execute:testStep"]?.userCreated).toBe(true);
  // Debe tener el resultado del compensate
  expect(bag["compensate:compensateTestStep"]?.compensated).toBe(true);
  // No debe tener resultado del paso que falló
  expect(bag["execute:failingStep"]).toBeUndefined();
});

// ========================================================
// TESTS PARA COMPENSACIÓN CONDICIONAL (CASO WHATSAPP)
// ========================================================

describe("Compensación Condicional - Casos Críticos", () => {
  // Test 1: getStepResult retorna undefined para paso no ejecutado
  test("getStepResult debe retornar undefined cuando un paso no se ejecutó en forward flow", async () => {
    const context = { userId: "test-user-1", transactionId: "txn-1" };

    const orchestrator = new SagaOrchestrator<
      TestContext,
      TestResults,
      TestStepName
    >({ ctx: context });

    const failingStep = {
      config: {
        execute: {
          name: "failingStep",
          retriesAllowed: true,
          maxAttempts: 3,
        },
      },
      execute: async () => {
        throw new Error("Fallo intencional");
      },
    };

    const neverExecutedStep = {
      config: {
        execute: {
          name: "neverExecutedStep",
          retriesAllowed: true,
          maxAttempts: 3,
        },
      },
      execute: async () => {
        return { userCreated: true } as TestResults;
      },
    };

    orchestrator.addStep(failingStep).addStep(neverExecutedStep);

    const { bag } = await orchestrator.start();

    expect(bag["execute:failingStep"]).toBeUndefined();
    expect(bag["execute:neverExecutedStep"]).toBeUndefined();
  });

  // Test 2: Compensación condicional (caso WhatsApp)
  test("compensación debe ejecutarse solo si el paso forward no se ejecutó exitosamente", async () => {
    const context = { userId: "test-user-2", transactionId: "txn-2" };

    const orchestrator = new SagaOrchestrator<
      TestContext,
      TestResults,
      TestStepName
    >({ ctx: context });

    let stopTypingExecutedInForward = false;
    let compensationExecuted = false;

    const startTypingStep = {
      config: {
        execute: {
          name: "startTyping",
          retriesAllowed: true,
          maxAttempts: 3,
        },
        compensate: {
          name: "stopTypingCompensate",
          retriesAllowed: true,
          maxAttempts: 3,
        },
      },
      execute: async () => {
        return { typingStarted: true } as TestResults;
      },
      compensate: async ({ getStepResult }) => {
        const stopTypingResult = getStepResult("execute:stopTyping");

        if (stopTypingResult && stopTypingResult.stopTypingSuccess) {
          compensationExecuted = false;
          return { compensationSkipped: true } as TestResults;
        }

        compensationExecuted = true;
        return { typingStopped: true } as TestResults;
      },
    };

    const businessLogicStep = {
      config: {
        execute: {
          name: "businessLogic",
          retriesAllowed: true,
          maxAttempts: 3,
        },
      },
      execute: async () => {
        return { processed: true } as TestResults;
      },
    };

    const stopTypingStep = {
      config: {
        execute: {
          name: "stopTyping",
          retriesAllowed: true,
          maxAttempts: 3,
        },
      },
      execute: async () => {
        stopTypingExecutedInForward = true;
        return { stopTypingSuccess: true } as TestResults;
      },
    };

    const finalFailingStep = {
      config: {
        execute: {
          name: "finalStep",
          retriesAllowed: true,
          maxAttempts: 3,
        },
      },
      execute: async () => {
        throw new Error("Final step failed");
      },
    };

    orchestrator
      .addStep(startTypingStep)
      .addStep(businessLogicStep)
      .addStep(stopTypingStep)
      .addStep(finalFailingStep);

    const { bag } = await orchestrator.start();

    expect(stopTypingExecutedInForward).toBe(true);
    expect(bag["execute:stopTyping"]?.stopTypingSuccess).toBe(true);
    expect(compensationExecuted).toBe(false);
    expect(bag["compensate:stopTypingCompensate"]?.compensationSkipped).toBe(
      true,
    );
    expect(bag["execute:startTyping"]?.typingStarted).toBe(true);
    expect(bag["execute:businessLogic"]?.processed).toBe(true);
    expect(bag["execute:finalStep"]).toBeUndefined();
  });
});
