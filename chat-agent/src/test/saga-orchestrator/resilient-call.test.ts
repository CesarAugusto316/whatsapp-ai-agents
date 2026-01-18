// @ts-nocheck
import { resilientQuery } from "@/application/patterns/saga-orchestrator/resilient-query.strategy";
import { CircuitBreaker } from "@/application/patterns/saga-orchestrator/circut-braker/circut-braker";
import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

// ========================================================
// MOCKS PARA EVITAR OUTPUT EN TESTS
// ========================================================
function mockLogger() {
  mock.module("@/infraestructure/logging", () => ({
    logger: {
      info: mock(() => {}),
      error: mock(() => {}),
    },
  }));
}

// ========================================================
// HELPERS SIMPLIFICADOS
// ========================================================

/**
 * Crea una operación que falla N veces antes de tener éxito
 */
function createFlakyOperation(
  failuresBeforeSuccess: number,
  successValue: any = "success",
) {
  let callCount = 0;
  return mock(async () => {
    callCount++;
    if (callCount <= failuresBeforeSuccess) {
      throw new Error(`Temporary failure ${callCount}`);
    }
    return successValue;
  });
}

/**
 * Crea una operación que siempre falla
 */
function createFailingOperation(errorMessage: string = "Permanent failure") {
  return mock(async () => {
    throw new Error(errorMessage);
  });
}

/**
 * Crea una operación que siempre tiene éxito
 */
function createSuccessfulOperation(value: any = "success") {
  return mock(async () => value);
}

/**
 * Crea una operación que se demora (pero eventualmente resuelve)
 */
function createSlowOperation(delayMs: number = 50, value: any = "slow result") {
  return mock(async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return value;
  });
}

/**
 * Crea una operación que nunca se resuelve (para timeouts)
 */
function createNeverResolvingOperation() {
  return mock(async () => {
    return new Promise(() => {}); // Promesa que nunca se resuelve
  });
}

/**
 * Crea un CircuitBreaker limpio para tests
 */
function createTestCircuitBreaker(
  failureThreshold: number = 3,
  resetTimeout: number = 1000,
  halfOpenSuccessThreshold: number = 2,
  name: string = "test-service",
) {
  return new CircuitBreaker(
    {
      failureThreshold,
      resetTimeout,
      halfOpenSuccessThreshold,
    },
    name,
  );
}

// ========================================================
// TESTS PRINCIPALES - ENFOQUE PRAGMÁTICO
// ========================================================

describe("resilientCall - Tests Pragmáticos", () => {
  beforeEach(() => {
    mock.restore();
    console.log = mock(() => {});
    console.error = mock(() => {});
    mockLogger();
  });

  afterEach(() => {
    mock.restore();
  });

  // ========================================================
  // ÉXITO BÁSICO
  // ========================================================

  describe("Éxito básico", () => {
    test("debería resolver exitosamente una operación simple", async () => {
      const operation = createSuccessfulOperation("result");
      const circuitBreaker = createTestCircuitBreaker();

      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
      });

      expect(result).toBe("result");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("debería usar builtIn 'api' por defecto", async () => {
      const operation = createSuccessfulOperation("api result");

      const result = await resilientQuery(operation, {
        builtIn: "api",
      });

      expect(result).toBe("api result");
    });

    test("debería usar builtIn 'llm' con configuración específica", async () => {
      const operation = createSuccessfulOperation("llm result");

      const result = await resilientQuery(operation, {
        builtIn: "llm",
      });

      expect(result).toBe("llm result");
    });
  });

  // ========================================================
  // RETRIES
  // ========================================================

  describe("Retries", () => {
    test("debería reintentar fallos transitorios", async () => {
      const operation = createFlakyOperation(2, "recovered");
      const circuitBreaker = createTestCircuitBreaker();

      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
        retryConfig: {
          maxAttempts: 5,
          intervalSeconds: 0.001, // 1ms delay para tests
        },
      });

      expect(result).toBe("recovered");
      expect(operation).toHaveBeenCalledTimes(3); // 2 fallos + 1 éxito
    });

    test("debería respetar maxAttempts", async () => {
      const operation = createFailingOperation("Always fails");
      const circuitBreaker = createTestCircuitBreaker();

      await expect(
        resilientQuery(operation, {
          circuitBraker: circuitBreaker,
          retryConfig: {
            maxAttempts: 2,
            intervalSeconds: 0.001,
          },
        }),
      ).rejects.toThrow("Always fails");

      expect(operation).toHaveBeenCalledTimes(2);
    });

    test("no debería reintentar errores 4xx (client errors)", async () => {
      const operation = mock(async () => {
        throw new Error("HTTP 400: Bad Request");
      });
      const circuitBreaker = createTestCircuitBreaker();

      await expect(
        resilientQuery(operation, {
          circuitBraker: circuitBreaker,
          retryConfig: {
            maxAttempts: 3,
            intervalSeconds: 0.001,
          },
        }),
      ).rejects.toThrow("HTTP 400: Bad Request");

      expect(operation).toHaveBeenCalledTimes(1); // Solo un intento
    });

    test("debería reintentar errores 429 (rate limit)", async () => {
      let attempts = 0;
      const operation = mock(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("HTTP 429: Too Many Requests");
        }
        return "success after rate limit";
      });
      const circuitBreaker = createTestCircuitBreaker();

      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
        retryConfig: {
          maxAttempts: 5,
          intervalSeconds: 0.001,
        },
      });

      expect(result).toBe("success after rate limit");
      expect(attempts).toBe(3);
    });

    test("debería reintentar errores 5xx (server errors)", async () => {
      let attempts = 0;
      const operation = mock(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("HTTP 500: Internal Server Error");
        }
        return "recovered";
      });
      const circuitBreaker = createTestCircuitBreaker();

      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
        retryConfig: {
          maxAttempts: 3,
          intervalSeconds: 0.001,
        },
      });

      expect(result).toBe("recovered");
      expect(attempts).toBe(2);
    });
  });

  // ========================================================
  // CIRCUIT BREAKER TRANSITIONS
  // ========================================================

  describe("Circuit Breaker transitions", () => {
    // test("debería abrir circuito tras múltiples fallos consecutivos", async () => {
    //   const circuitBreaker = createTestCircuitBreaker(2); // Se abre tras 2 fallos
    //   const operation = createFailingOperation("Service down");

    //   // Primer fallo
    //   await expect(
    //     resilientCall(operation, { circuitBraker: circuitBreaker }),
    //   ).rejects.toThrow("Service down");
    //   expect(circuitBreaker.getState()).toBe("CLOSED");

    //   // Segundo fallo - abre circuito
    //   await expect(
    //     resilientCall(operation, { circuitBraker: circuitBreaker }),
    //   ).rejects.toThrow("Service down");
    //   expect(circuitBreaker.getState()).toBe("OPEN");
    // });

    test("debería abrir circuito tras múltiples fallos consecutivos", async () => {
      const circuitBreaker = createTestCircuitBreaker(2);
      const operation = createFailingOperation("Service down");

      // Sin reintentos para que el test sea rápido
      const options = {
        circuitBraker: circuitBreaker,
        retryConfig: { maxAttempts: 1 },
      };

      await expect(resilientQuery(operation, options)).rejects.toThrow(
        "Service down",
      );
      expect(circuitBreaker.getState()).toBe("CLOSED");

      await expect(resilientQuery(operation, options)).rejects.toThrow(
        "Service down",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");
    });

    test("debería rechazar inmediatamente con circuito abierto", async () => {
      const circuitBreaker = createTestCircuitBreaker(1);

      // Primera llamada (abre circuito)
      await expect(
        resilientQuery(createFailingOperation(), {
          circuitBraker: circuitBreaker,
          retryConfig: { maxAttempts: 1 }, // 👈
        }),
      ).rejects.toThrow("Permanent failure");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Segunda llamada (rechazada inmediatamente)
      const shouldNotRun = createSuccessfulOperation();
      await expect(
        resilientQuery(shouldNotRun, { circuitBraker: circuitBreaker }),
      ).rejects.toThrow('CircuitBreaker "test-service" is OPEN');
      expect(shouldNotRun).toHaveBeenCalledTimes(0);
    });

    test("debería usar circuito half-open después de timeout", async () => {
      const circuitBreaker = createTestCircuitBreaker(1, 100);

      // Abrir circuito
      await expect(
        resilientQuery(createFailingOperation("Initial fail"), {
          circuitBraker: circuitBreaker,
          retryConfig: { maxAttempts: 1 }, // 👈
        }),
      ).rejects.toThrow("Initial fail");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Esperar resetTimeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Circuito en half-open debería permitir operación
      const successOp = createSuccessfulOperation("recovered");
      const result = await resilientQuery(successOp, {
        circuitBraker: circuitBreaker,
        retryConfig: { maxAttempts: 1 }, // 👈
      });

      expect(result).toBe("recovered");
      expect(successOp).toHaveBeenCalledTimes(1);
    });

    test("debería rechazar inmediatamente con circuito abierto", async () => {
      const circuitBreaker = createTestCircuitBreaker(1); // Se abre tras 1 fallo

      // Abrir circuito
      await expect(
        resilientQuery(createFailingOperation(), {
          circuitBraker: circuitBreaker,
        }),
      ).rejects.toThrow("Permanent failure");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Intentar operación - debería rechazar inmediatamente
      const shouldNotRun = createSuccessfulOperation();
      await expect(
        resilientQuery(shouldNotRun, { circuitBraker: circuitBreaker }),
      ).rejects.toThrow('CircuitBreaker "test-service" is OPEN');

      expect(shouldNotRun).toHaveBeenCalledTimes(0);
    });

    test("debería usar circuito half-open después de timeout", async () => {
      // Este test simula el comportamiento de half-open
      const circuitBreaker = createTestCircuitBreaker(1, 100); // Reset rápido para tests
      const operation = createFailingOperation("Initial fail");

      // Abrir circuito
      await expect(
        resilientQuery(operation, { circuitBraker: circuitBreaker }),
      ).rejects.toThrow("Initial fail");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Esperar un poco más que el resetTimeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // El circuito debería permitir operaciones nuevamente (half-open)
      // Nota: El state checking en CircuitBreaker es síncrono, pero el cambio
      // a half-open ocurre cuando se llama a execute() después del timeout
      const successOp = createSuccessfulOperation("recovered");
      const result = await resilientQuery(successOp, {
        circuitBraker: circuitBreaker,
      });

      expect(result).toBe("recovered");
      expect(successOp).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================
  // TIMEOUTS (ENFOQUE SIMPLIFICADO)
  // ========================================================

  describe("Timeouts", () => {
    test("debería aplicar timeout a operaciones lentas", async () => {
      const operation = createSlowOperation(100); // Operación de 100ms
      const circuitBreaker = createTestCircuitBreaker();

      // Configurar timeout más corto que la operación
      await expect(
        resilientQuery(operation, {
          circuitBraker: circuitBreaker,
          timeoutMs: 50,
        }),
      ).rejects.toThrow("Timeout after 50ms");
    });

    test("debería permitir operaciones dentro del timeout", async () => {
      const operation = createSlowOperation(30); // Operación de 30ms
      const circuitBreaker = createTestCircuitBreaker();

      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
        timeoutMs: 100, // Timeout mayor que la operación
      });

      expect(result).toBe("slow result");
    });

    test("debería combinar timeout con retries", async () => {
      let attempts = 0;
      const operation = mock(async () => {
        attempts++;
        // Primer intento: se demora mucho (timeout)
        // Segundo intento: éxito rápido
        if (attempts === 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "too slow";
        }
        return "success";
      });

      const circuitBreaker = createTestCircuitBreaker();

      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
        timeoutMs: 50,
        retryConfig: {
          maxAttempts: 2,
          intervalSeconds: 0.001,
        },
      });

      expect(result).toBe("success");
      expect(attempts).toBe(2);
    });
  });

  // ========================================================
  // CONCURRENCIA
  // ========================================================

  describe("Concurrencia", () => {
    test("debería manejar múltiples llamadas exitosas simultáneas", async () => {
      const circuitBreaker = createTestCircuitBreaker(10); // Alto threshold

      const operations = Array.from({ length: 5 }, (_, i) =>
        mock(async () => `result-${i}`),
      );

      const promises = operations.map((op, i) =>
        resilientQuery(op, {
          circuitBraker: circuitBreaker,
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result).toBe(`result-${i}`);
      });
    });

    test("debería manejar fallas concurrentes sin abrir circuito prematuramente", async () => {
      const circuitBreaker = createTestCircuitBreaker(5); // Alto threshold

      // 3 operaciones, 2 fallan, 1 tiene éxito
      const operations = [
        createFailingOperation("Fail 1"),
        createFailingOperation("Fail 2"),
        createSuccessfulOperation("Success"),
      ];

      const promises = operations.map((op) =>
        resilientQuery(op, {
          circuitBraker: circuitBreaker,
          retryConfig: { maxAttempts: 1, intervalSeconds: 0 },
        }),
      );

      const results = await Promise.allSettled(promises);

      const rejected = results.filter((r) => r.status === "rejected");
      const fulfilled = results.filter((r) => r.status === "fulfilled");

      expect(rejected).toHaveLength(2);
      expect(fulfilled).toHaveLength(1);
      expect(circuitBreaker.getState()).toBe("CLOSED"); // No debería abrir con solo 2 fallos
    });

    test("debería abrir circuito con suficientes fallas concurrentes", async () => {
      const circuitBreaker = createTestCircuitBreaker(3); // Se abre tras 3 fallos

      // 5 operaciones, todas fallan
      const operations = Array.from({ length: 5 }, (_, i) =>
        createFailingOperation(`Fail ${i}`),
      );

      const promises = operations.map((op) =>
        resilientQuery(op, {
          circuitBraker: circuitBreaker,
          retryConfig: { maxAttempts: 1, intervalSeconds: 0 },
        }),
      );

      await Promise.allSettled(promises);

      // Después de suficientes fallos, el circuito debería abrirse
      // Nota: Dependiendo del timing, puede que algunas llamadas se rechacen
      // inmediatamente si el circuito ya se abrió
      expect(circuitBreaker.getState()).toBe("OPEN");
    });
  });

  // ========================================================
  // CONFIGURACIÓN Y CASOS DE BORDE
  // ========================================================

  describe("Configuración y casos de borde", () => {
    test("debería priorizar circuitBraker personalizado sobre builtIn", async () => {
      const customBreaker = createTestCircuitBreaker(1, 1000, 1, "custom");
      const operation = createSuccessfulOperation("result");

      const result = await resilientQuery(operation, {
        builtIn: "llm", // Este debería ignorarse
        circuitBraker: customBreaker,
      });

      expect(result).toBe("result");
      expect(customBreaker.getState()).toBe("CLOSED");
    });

    test("debería manejar diferentes tipos de retorno", async () => {
      const circuitBreaker = createTestCircuitBreaker();

      const stringResult = await resilientQuery(
        createSuccessfulOperation("string"),
        { circuitBraker: circuitBreaker },
      );
      const numberResult = await resilientQuery(createSuccessfulOperation(42), {
        circuitBraker: circuitBreaker,
      });
      const objectResult = await resilientQuery(
        createSuccessfulOperation({ key: "value" }),
        { circuitBraker: circuitBreaker },
      );
      const arrayResult = await resilientQuery(
        createSuccessfulOperation([1, 2, 3]),
        { circuitBraker: circuitBreaker },
      );

      expect(stringResult).toBe("string");
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ key: "value" });
      expect(arrayResult).toEqual([1, 2, 3]);
    });

    test("debería propagar el error original con stack trace", async () => {
      const circuitBreaker = createTestCircuitBreaker();
      const originalError = new Error("Original error");
      originalError.name = "CustomError";

      const operation = mock(async () => {
        throw originalError;
      });

      try {
        await resilientQuery(operation, {
          circuitBraker: circuitBreaker,
          retryConfig: { maxAttempts: 1, intervalSeconds: 0 },
        });
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBe(originalError);
        expect(err.name).toBe("CustomError");
        expect(err.message).toBe("Original error");
      }
    });

    test("debería usar configuraciones de retry personalizadas", async () => {
      const circuitBreaker = createTestCircuitBreaker();
      const operation = createFlakyOperation(2, "final success");

      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
        retryConfig: {
          maxAttempts: 4,
          intervalSeconds: 0.005, // 5ms
          backoffRate: 1.5,
        },
      });

      expect(result).toBe("final success");
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  // ========================================================
  // PERFORMANCE Y CASOS ESPECIALES
  // ========================================================

  describe("Performance y casos especiales", () => {
    test("debería tener overhead mínimo en caso de éxito", async () => {
      const circuitBreaker = createTestCircuitBreaker();
      const operation = createSuccessfulOperation("fast");

      const start = performance.now();
      const result = await resilientQuery(operation, {
        circuitBraker: circuitBreaker,
      });
      const end = performance.now();

      expect(result).toBe("fast");
      expect(end - start).toBeLessThan(100); // Menos de 100ms overhead
    });

    test("debería manejar operaciones que lanzan errores síncronos", async () => {
      const circuitBreaker = createTestCircuitBreaker();
      const operation = mock(() => {
        throw new Error("Sync error");
      });

      await expect(
        resilientQuery(operation as any, {
          circuitBraker: circuitBreaker,
        }),
      ).rejects.toThrow("Sync error");
    });

    test("debería funcionar sin options (usar defaults)", async () => {
      const operation = createSuccessfulOperation("default");

      // Sin options, debería usar defaults
      const result = await resilientQuery(operation, {});

      expect(result).toBe("default");
    });
  });
});
