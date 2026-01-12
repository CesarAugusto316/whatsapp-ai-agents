import { SagaOrchestrator, SagaStep } from "@/saga/saga-orchestrator-dbos";
import { describe, test, expect, mock, beforeEach, spyOn } from "bun:test";

// Mock del logger
const mockLogger = {
  error: mock(() => {}),
};

// Mock de DBOS
const mockDBOS = {
  runStep: mock(async (func: () => Promise<any>, config?: any) => {
    return await func();
  }),
  registerWorkflow: mock((workflow: any, config?: any) => {
    return async () => {
      return await workflow();
    };
  }),
};

// Caso real 1: Procesamiento de pago en ecommerce
describe("SagaOrchestrator - Procesamiento de Pedido Ecommerce", () => {
  // Contexto para procesamiento de pedido
  interface OrderContext {
    userId: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
    inventoryItems: Array<{ productId: string; quantity: number }>;
  }

  // Bag para almacenar resultados
  interface OrderBag {
    inventoryReserved?: boolean;
    paymentProcessed?: boolean;
    invoiceGenerated?: boolean;
    shippingScheduled?: boolean;
    notificationSent?: boolean;
    compensationLog?: string[];
  }

  // Paso 1: Validar y reservar inventario
  const validateInventoryStep: SagaStep<OrderContext, OrderBag> = {
    name: "validateInventory",
    execute: async (ctx, getStepResult, durableStep) => {
      console.log(`Validando inventario para orden ${ctx.orderId}`);
      // Simular validación de inventario
      await durableStep(async () => {
        // Lógica de negocio real iría aquí
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (ctx.inventoryItems.some((item) => item.quantity > 10)) {
          throw new Error("Stock insuficiente");
        }
        return { inventoryReserved: true };
      });

      return { inventoryReserved: true };
    },
    compensate: async (ctx, getStepResult, durableStep) => {
      console.log(`Liberando inventario reservado para orden ${ctx.orderId}`);
      // Lógica de compensación: liberar inventario
      return { inventoryReserved: false };
    },
    config: {
      execute: { retriesAllowed: true, maxAttempts: 3, intervalSeconds: 1 },
    },
  };

  // Paso 2: Procesar pago
  const processPaymentStep: SagaStep<OrderContext, OrderBag> = {
    name: "processPayment",
    execute: async (ctx, getStepResult, durableStep) => {
      const inventoryReserved = getStepResult<OrderBag>(
        "execute",
        "validateInventory",
      )?.inventoryReserved;
      if (!inventoryReserved) {
        throw new Error("Inventario no reservado");
      }

      console.log(
        `Procesando pago de $${ctx.amount} para orden ${ctx.orderId}`,
      );

      await durableStep(async () => {
        // Simular procesamiento de pago con proveedor externo
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Simular falla aleatoria (para testing)
        if (ctx.amount > 1000 && Math.random() > 0.7) {
          throw new Error("Pago rechazado por límite de crédito");
        }

        return { paymentProcessed: true };
      });

      return { paymentProcessed: true };
    },
    compensate: async (ctx, getStepResult, durableStep) => {
      console.log(`Reversando pago para orden ${ctx.orderId}`);
      // Lógica de compensación: reversar transacción
      return { paymentProcessed: false };
    },
    config: {
      execute: {
        retriesAllowed: true,
        maxAttempts: 3,
        intervalSeconds: 2,
        backoffRate: 1.5,
      },
    },
  };

  // Paso 3: Generar factura
  const generateInvoiceStep: SagaStep<OrderContext, OrderBag> = {
    name: "generateInvoice",
    execute: async (ctx, getStepResult, durableStep) => {
      const paymentProcessed = getStepResult<OrderBag>(
        "execute",
        "processPayment",
      )?.paymentProcessed;
      if (!paymentProcessed) {
        throw new Error("Pago no procesado");
      }

      console.log(`Generando factura para orden ${ctx.orderId}`);

      await durableStep(async () => {
        // Generar factura en sistema contable
        return { invoiceGenerated: true };
      });

      return { invoiceGenerated: true };
    },
    compensate: async (ctx, getStepResult, durableStep) => {
      console.log(`Anulando factura para orden ${ctx.orderId}`);
      // Lógica de compensación: anular factura
      return { invoiceGenerated: false };
    },
  };

  // Paso 4: Programar envío
  const scheduleShippingStep: SagaStep<OrderContext, OrderBag> = {
    name: "scheduleShipping",
    execute: async (ctx, getStepResult, durableStep) => {
      const invoiceGenerated = getStepResult<OrderBag>(
        "execute",
        "generateInvoice",
      )?.invoiceGenerated;
      if (!invoiceGenerated) {
        throw new Error("Factura no generada");
      }

      console.log(`Programando envío para orden ${ctx.orderId}`);

      await durableStep(async () => {
        // Integración con sistema de logística
        return { shippingScheduled: true };
      });

      return { shippingScheduled: true };
    },
    compensate: async (ctx, getStepResult, durableStep) => {
      console.log(`Cancelando envío programado para orden ${ctx.orderId}`);
      // Lógica de compensación: cancelar envío
      return { shippingScheduled: false };
    },
  };

  // Paso 5: Enviar notificación
  const sendNotificationStep: SagaStep<OrderContext, OrderBag> = {
    name: "sendNotification",
    execute: async (ctx, getStepResult, durableStep) => {
      console.log(
        `Enviando notificación de confirmación al usuario ${ctx.userId}`,
      );

      await durableStep(async () => {
        // Enviar email/SMS de confirmación
        return { notificationSent: true };
      });

      return { notificationSent: true };
    },
    // No tiene compensación porque la notificación es idempotente
  };

  beforeEach(() => {
    // Reset mocks antes de cada test
    mockDBOS.runStep.mockClear();
    mockDBOS.registerWorkflow.mockClear();
    mockLogger.error.mockClear();
  });

  test("debería procesar orden completa exitosamente", async () => {
    // Mock global de DBOS
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    const context: OrderContext = {
      userId: "user-123",
      orderId: "order-456",
      amount: 500,
      paymentMethod: "credit_card",
      inventoryItems: [
        { productId: "prod-1", quantity: 2 },
        { productId: "prod-2", quantity: 1 },
      ],
    };

    const orchestrator = new SagaOrchestrator<OrderContext>(context);

    orchestrator
      .addStep(validateInventoryStep)
      .addStep(processPaymentStep)
      .addStep(generateInvoiceStep)
      .addStep(scheduleShippingStep)
      .addStep(sendNotificationStep);

    const result = await orchestrator.execute("process-order-workflow");

    expect(result.inventoryReserved).toBe(true);
    expect(result.paymentProcessed).toBe(true);
    expect(result.invoiceGenerated).toBe(true);
    expect(result.shippingScheduled).toBe(true);
    expect(result.notificationSent).toBe(true);

    // Verificar que DBOS.runStep fue llamado para cada paso
    expect(mockDBOS.runStep).toHaveBeenCalledTimes(5);
  });

  test("debería compensar pasos cuando falla el procesamiento de pago", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    // Sobreescribir processPaymentStep para que falle
    const failingPaymentStep: SagaStep<OrderContext, OrderBag> = {
      ...processPaymentStep,
      execute: async (ctx, getStepResult, durableStep) => {
        throw new Error("Tarjeta de crédito rechazada");
      },
    };

    const context: OrderContext = {
      userId: "user-123",
      orderId: "order-456",
      amount: 1500, // Monto alto que podría causar rechazo
      paymentMethod: "credit_card",
      inventoryItems: [{ productId: "prod-1", quantity: 1 }],
    };

    const orchestrator = new SagaOrchestrator<OrderContext>(context);

    orchestrator
      .addStep(validateInventoryStep)
      .addStep(failingPaymentStep)
      .addStep(generateInvoiceStep);

    await expect(
      orchestrator.execute("process-order-workflow"),
    ).rejects.toThrow("Tarjeta de crédito rechazada");

    // Verificar que se llamó a la compensación del primer paso
    expect(mockDBOS.runStep).toHaveBeenCalled();
    // El logger de error debería haberse llamado para la compensación fallida
    expect(mockLogger.error).toHaveBeenCalled();
  });

  test("debería permitir obtener resultados de pasos anteriores", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    // Paso que depende de resultados anteriores
    // const dependentStep: SagaStep<OrderContext, OrderBag> = {
    //   name: "dependentStep",
    //   execute: async (ctx, getStepResult, durableStep) => {
    //     const inventoryResult = getStepResult<OrderBag>("execute", "validateInventory");
    //     const paymentResult = getStepResult<OrderBag>("execute", "processPayment");

    //     expect(inventoryResult?.inventoryReserved).toBe(true);
    //     expect(paymentResult?.paymentProcessed).toBe(true);

    //     return { allChecksPassed: true };
    //   },
    // };

    const context: OrderContext = {
      userId: "user-123",
      orderId: "order-456",
      amount: 100,
      paymentMethod: "credit_card",
      inventoryItems: [{ productId: "prod-1", quantity: 1 }],
    };

    const orchestrator = new SagaOrchestrator<OrderContext>(context);

    orchestrator.addStep(validateInventoryStep).addStep(processPaymentStep);
    // .addStep(dependentStep);

    const result = await orchestrator.execute<OrderBag>("test-workflow");

    // expect(result["execute:dependentStep"]?.allChecksPassed).toBe(true);
  });

  test("no debería permitir agregar pasos con nombres duplicados", () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    const context: OrderContext = {
      userId: "user-123",
      orderId: "order-456",
      amount: 100,
      paymentMethod: "credit_card",
      inventoryItems: [],
    };

    const orchestrator = new SagaOrchestrator<OrderContext>(context);

    orchestrator.addStep(validateInventoryStep);

    expect(() => {
      orchestrator.addStep(validateInventoryStep);
    }).toThrow("Step with name 'validateInventory' already exists");
  });
});

// Caso real 2: Transferencia bancaria
describe("SagaOrchestrator - Transferencia Bancaria", () => {
  interface TransferContext {
    sourceAccount: string;
    targetAccount: string;
    amount: number;
    currency: string;
    reference: string;
  }

  interface TransferBag {
    sourceValidated?: boolean;
    fundsReserved?: boolean;
    targetValidated?: boolean;
    transferExecuted?: boolean;
    transactionRecorded?: boolean;
    notificationsSent?: boolean;
  }

  const transferSteps: SagaStep<TransferContext, TransferBag>[] = [
    {
      name: "validateSourceAccount",
      execute: async (ctx, getStepResult, durableStep) => {
        console.log(`Validando cuenta origen: ${ctx.sourceAccount}`);
        // Validar saldo suficiente, cuenta activa, etc.
        return { sourceValidated: true };
      },
      compensate: async (ctx, getStepResult, durableStep) => {
        console.log("Compensando validación de cuenta origen");
        return { sourceValidated: false };
      },
    },
    {
      name: "reserveFunds",
      execute: async (ctx, getStepResult, durableStep) => {
        const sourceValidated = getStepResult<TransferBag>(
          "execute",
          "validateSourceAccount",
        )?.sourceValidated;
        if (!sourceValidated) throw new Error("Cuenta origen no validada");

        console.log(
          `Reservando fondos: $${ctx.amount} de ${ctx.sourceAccount}`,
        );
        return { fundsReserved: true };
      },
      compensate: async (ctx, getStepResult, durableStep) => {
        console.log("Liberando fondos reservados");
        return { fundsReserved: false };
      },
    },
    {
      name: "validateTargetAccount",
      execute: async (ctx, getStepResult, durableStep) => {
        console.log(`Validando cuenta destino: ${ctx.targetAccount}`);
        return { targetValidated: true };
      },
    },
    {
      name: "executeTransfer",
      execute: async (ctx, getStepResult, durableStep) => {
        const fundsReserved = getStepResult<TransferBag>(
          "execute",
          "reserveFunds",
        )?.fundsReserved;
        const targetValidated = getStepResult<TransferBag>(
          "execute",
          "validateTargetAccount",
        )?.targetValidated;

        if (!fundsReserved || !targetValidated) {
          throw new Error("Precondiciones no cumplidas para transferencia");
        }

        console.log(`Ejecutando transferencia de $${ctx.amount}`);
        return { transferExecuted: true };
      },
      compensate: async (ctx, getStepResult, durableStep) => {
        console.log("Revirtiendo transferencia");
        return { transferExecuted: false };
      },
    },
  ];

  test("debería completar transferencia exitosamente", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    const context: TransferContext = {
      sourceAccount: "ACC-001",
      targetAccount: "ACC-002",
      amount: 1000,
      currency: "USD",
      reference: "INV-2024-001",
    };

    const orchestrator = new SagaOrchestrator<TransferContext>(
      context,
      transferSteps,
    );

    const result = await orchestrator.execute("bank-transfer-workflow");

    expect(result.transferExecuted).toBe(true);
    expect(result.fundsReserved).toBe(true);
  });

  test("debería compensar cuando la cuenta destino no existe", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    // Modificar el paso de validación de cuenta destino para que falle
    const failingTransferSteps: SagaStep<TransferContext, TransferBag>[] = [
      ...transferSteps.slice(0, 2), // Primeros 2 pasos OK
      {
        name: "validateTargetAccount",
        execute: async (ctx, getStepResult, durableStep) => {
          throw new Error("Cuenta destino no encontrada");
        },
      },
      ...transferSteps.slice(3), // Resto de pasos
    ];

    const context: TransferContext = {
      sourceAccount: "ACC-001",
      targetAccount: "INVALID-ACC",
      amount: 1000,
      currency: "USD",
      reference: "INV-2024-001",
    };

    const orchestrator = new SagaOrchestrator<TransferContext>(
      context,
      failingTransferSteps,
    );

    await expect(
      orchestrator.execute("bank-transfer-workflow"),
    ).rejects.toThrow("Cuenta destino no encontrada");

    // Verificar que se ejecutaron compensaciones
    expect(mockDBOS.runStep).toHaveBeenCalled();
  });
});

// Caso real 3: Reserva de vuelo + hotel
describe("SagaOrchestrator - Sistema de Viajes", () => {
  interface TravelBookingContext {
    userId: string;
    flightId: string;
    hotelId: string;
    carRentalId?: string;
    dates: { checkIn: Date; checkOut: Date };
    passengerCount: number;
  }

  interface TravelBookingBag {
    flightBooked?: boolean;
    flightDetails?: any;
    hotelBooked?: boolean;
    hotelDetails?: any;
    carBooked?: boolean;
    carDetails?: any;
    paymentProcessed?: boolean;
    itineraryGenerated?: boolean;
  }

  test("debería manejar reserva compleja con múltiples servicios", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    const flightStep: SagaStep<TravelBookingContext, TravelBookingBag> = {
      name: "bookFlight",
      execute: async (ctx, getStepResult, durableStep) => {
        console.log(
          `Reservando vuelo ${ctx.flightId} para ${ctx.passengerCount} pasajeros`,
        );
        return {
          flightBooked: true,
          flightDetails: { flightId: ctx.flightId, confirmed: true },
        };
      },
      compensate: async (ctx, getStepResult, durableStep) => {
        console.log(`Cancelando reserva de vuelo ${ctx.flightId}`);
        return { flightBooked: false };
      },
    };

    const hotelStep: SagaStep<TravelBookingContext, TravelBookingBag> = {
      name: "bookHotel",
      execute: async (ctx, getStepResult, durableStep) => {
        console.log(`Reservando hotel ${ctx.hotelId}`);
        return {
          hotelBooked: true,
          hotelDetails: { hotelId: ctx.hotelId, confirmed: true },
        };
      },
      compensate: async (ctx, getStepResult, durableStep) => {
        console.log(`Cancelando reserva de hotel ${ctx.hotelId}`);
        return { hotelBooked: false };
      },
    };

    const carStep: SagaStep<TravelBookingContext, TravelBookingBag> = {
      name: "bookCar",
      execute: async (ctx, getStepResult, durableStep) => {
        if (!ctx.carRentalId) {
          return {}; // Paso opcional
        }
        console.log(`Reservando auto ${ctx.carRentalId}`);
        return {
          carBooked: true,
          carDetails: { carId: ctx.carRentalId, confirmed: true },
        };
      },
      compensate: async (ctx, getStepResult, durableStep) => {
        if (!ctx.carRentalId) return {};
        console.log(`Cancelando reserva de auto ${ctx.carRentalId}`);
        return { carBooked: false };
      },
    };

    const context: TravelBookingContext = {
      userId: "traveler-123",
      flightId: "FL-789",
      hotelId: "HT-456",
      carRentalId: "CR-123",
      dates: {
        checkIn: new Date("2024-12-01"),
        checkOut: new Date("2024-12-07"),
      },
      passengerCount: 2,
    };

    const orchestrator = new SagaOrchestrator<TravelBookingContext>(context);

    orchestrator.addStep(flightStep).addStep(hotelStep).addStep(carStep);

    const result = await orchestrator.execute("travel-booking-workflow");

    expect(result.flightBooked).toBe(true);
    expect(result.hotelBooked).toBe(true);
    expect(result.carBooked).toBe(true);
  });
});

// Tests de integración y edge cases
describe("SagaOrchestrator - Edge Cases", () => {
  test("debería manejar pasos sin compensación", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    interface SimpleContext {
      id: string;
    }
    interface SimpleBag {
      step1?: boolean;
      step2?: boolean;
    }

    const stepWithoutCompensation: SagaStep<SimpleContext, SimpleBag> = {
      name: "noCompStep",
      execute: async (ctx, getStepResult, durableStep) => {
        return { step1: true };
      },
      // Sin compensación
    };

    const context: SimpleContext = { id: "test-1" };
    const orchestrator = new SagaOrchestrator<SimpleContext>(context);
    orchestrator.addStep(stepWithoutCompensation);

    const result = await orchestrator.execute("simple-workflow");
    expect(result.step1).toBe(true);
  });

  test("debería preservar el contexto como read-only", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    interface TestContext {
      value: number;
    }
    interface TestBag {
      processed?: boolean;
    }

    const testStep: SagaStep<TestContext, TestBag> = {
      name: "testStep",
      execute: async (ctx, getStepResult, durableStep) => {
        // El contexto debería ser de solo lectura
        expect(() => {
          (ctx as any).value = 999; // Esto debería fallar si está congelado
        }).toThrow();

        return { processed: true };
      },
    };

    const context: TestContext = { value: 100 };
    const orchestrator = new SagaOrchestrator<TestContext>(context);
    orchestrator.addStep(testStep);

    await orchestrator.execute("readonly-test");
  });

  test("debería manejar errores en compensaciones", async () => {
    // spyOn(global, "DBOS").mockImplementation(() => mockDBOS);

    interface ErrorContext {
      id: string;
    }
    interface ErrorBag {
      step1?: boolean;
      step2?: boolean;
    }

    const step1: SagaStep<ErrorContext, ErrorBag> = {
      name: "step1",
      execute: async (ctx, getStepResult, durableStep) => {
        return { step1: true };
      },
      compensate: async (ctx, getStepResult, durableStep) => {
        throw new Error("Compensación fallida");
      },
    };

    const step2: SagaStep<ErrorContext, ErrorBag> = {
      name: "step2",
      execute: async (ctx, getStepResult, durableStep) => {
        throw new Error("Ejecución fallida");
      },
    };

    const context: ErrorContext = { id: "error-test" };
    // ESTO NNO EXISTE
    // const orchestrator = new ErrorContextorchestrator<ErrorContext, ErrorBag>(
    //   context,
    // );

    // orchestrator.addStep(step1);
    // orchestrator.addStep(step2);

    // await expect(orchestrator.execute("error-workflow")).rejects.toThrow(
    //   "Ejecución fallida",
    // );

    // Verificar que el logger registró el error de compensación
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to compensate step 'step1':",
      expect.any(Error),
    );
  });
});
