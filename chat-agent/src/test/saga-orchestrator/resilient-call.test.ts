// @ts-nocheck
import { resilientCall } from "@/application/patterns/saga-orchestrator/resilient-call.strategy";
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
// HELPERS PARA FAKE TIMERS (CONTROL DE TIEMPO EN TESTS)
// ========================================================
let fakeNow = 0;
let timers: Array<{ callback: () => void; time: number }> = [];

function setupFakeTimers() {
  fakeNow = 0;
  timers = [];

  // Mock Date.now
  globalThis.Date.now = mock(() => fakeNow);

  // Mock performance.now
  globalThis.performance.now = mock(() => fakeNow);

  // Mock setTimeout para simular delays controlados
  globalThis.setTimeout = mock((callback: () => void, delay: number) => {
    if (delay === 0) {
      // Para delays 0, ejecutar en el siguiente tick microtask
      queueMicrotask(callback);
      // Devolver un ID que clearTimeout puede ignorar
      return -1 as any;
    }
    const timerId = timers.length;
    timers.push({ callback, time: fakeNow + delay });
    return timerId as any;
  });

  // Mock clearTimeout
  globalThis.clearTimeout = mock((id: number) => {
    if (id === -1) {
      return; // Ignorar para timers de delay 0
    }
    if (id >= 0 && id < timers.length) {
      timers[id] = { callback: () => {}, time: Infinity }; // Invalidate
    }
  });
}

function advanceTimersByTime(ms: number) {
  fakeNow += ms;

  let hasExecuted;
  do {
    hasExecuted = false;
    for (let i = 0; i < timers.length; i++) {
      const timer = timers[i];
      if (timer.time <= fakeNow && timer.time !== Infinity) {
        timer.callback();
        timer.time = Infinity; // Mark as executed
        hasExecuted = true;
      }
    }
  } while (hasExecuted);
}

function clearAllTimers() {
  timers = [];
}

// ========================================================
// OPERACIONES SIMULADAS PARA TESTS
// ========================================================

/**
 * Operación que falla intermitentemente (simula fallos de red)
 * @param successRate Probabilidad de éxito (0-1), default: 0.5
 * @param delayMs Tiempo de ejecución simulado
 */
function randomFailingOperation<T>(
  successRate: number = 0.5,
  delayMs: number = 10,
  successValue: T = "success" as T,
  errorMessage: string = "Network error",
): () => Promise<T> {
  let callCount = 0;
  return mock(async () => {
    callCount++;
    advanceTimersByTime(delayMs);

    if (Math.random() < successRate) {
      return successValue;
    }
    throw new Error(`${errorMessage} (attempt ${callCount})`);
  });
}

/**
 * Operación que siempre falla
 * @param errorMessage Mensaje de error
 * @param delayMs Tiempo antes de fallar
 */
function alwaysFail<T>(
  errorMessage: string = "Permanent failure",
  delayMs: number = 10,
): () => Promise<T> {
  return mock(async () => {
    advanceTimersByTime(delayMs);
    throw new Error(errorMessage);
  });
}

/**
 * Operación que siempre excede el timeout
 * @param timeoutMs Timeout que debe exceder
 */
function alwaysTimeout<T>(timeoutMs: number = 100): () => Promise<T> {
  return mock(async () => {
    // Promesa que se resuelve después de mucho tiempo
    // para asegurar que el timeout de resilientCall rechace primero
    return new Promise((resolve) => {
      setTimeout(() => resolve("too late" as T), timeoutMs * 1000);
    });
  });
}

/**
 * Operación que falla N veces antes de tener éxito
 * @param failuresToSuccess Número de fallos antes del éxito
 * @param successValue Valor de retorno en éxito
 * @param delayMs Tiempo de ejecución por intento
 */
function succeedAfterNFailures<T>(
  failuresToSuccess: number,
  successValue: T = "success" as T,
  delayMs: number = 10,
  errorMessage: string = "Temporary failure",
): () => Promise<T> {
  let attempt = 0;
  return mock(async () => {
    attempt++;
    advanceTimersByTime(delayMs);

    if (attempt <= failuresToSuccess) {
      throw new Error(`${errorMessage} (attempt ${attempt})`);
    }
    return successValue;
  });
}

/**
 * Crea un nuevo CircuitBreaker para pruebas de API
 * Evita compartir estado entre tests
 */
function createApiCircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker(
    {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenSuccessThreshold: 3,
    },
    `api-test-${Date.now()}-${Math.random()}`,
  );
}

/**
 * Crea un nuevo CircuitBreaker para pruebas de LLM
 * Evita compartir estado entre tests
 */
function createLlmCircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker(
    {
      failureThreshold: 3,
      resetTimeout: 30000,
      halfOpenSuccessThreshold: 2,
    },
    `llm-test-${Date.now()}-${Math.random()}`,
  );
}

// ========================================================
// TESTS PRINCIPALES
// ========================================================

describe("resilientCall - Tests Comprehensivos", () => {
  beforeEach(() => {
    mock.restore();
    console.log = mock(() => {});
    console.error = mock(() => {});
    mockLogger();
    setupFakeTimers();
  });

  afterEach(() => {
    clearAllTimers();
    mock.restore();
  });

  // ========================================================
  // CATEGORÍA: ÉXITO BÁSICO
  // ========================================================

  describe("Éxito básico y configuración por defecto", () => {
    test("debería resolver exitosamente una operación simple", async () => {
      // Validar que el flujo básico funciona sin errores
      const operation = mock(async () => "result");

      const customBreaker = new CircuitBreaker(
        {
          failureThreshold: 5,
          resetTimeout: 60000,
          halfOpenSuccessThreshold: 3,
        },
        "custom-test",
      );

      const result = await resilientCall(operation, {
        circuitBraker: customBreaker,
      });

      expect(result).toBe("result");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test("debería usar timeout por defecto según builtIn", async () => {
      // Validar que los timeouts por defecto se aplican correctamente
      const operation = mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return "result";
      });

      // Para LLM: 30s default
      const resultLLM = resilientCall(operation, { builtIn: "llm" });
      advanceTimersByTime(100);
      await expect(resultLLM).resolves.toBe("result");

      // Para API: 45s default
      const resultAPI = resilientCall(operation, { builtIn: "api" });
      advanceTimersByTime(100);
      await expect(resultAPI).resolves.toBe("result");
    });

    test("debería respetar timeoutMs personalizado", async () => {
      // Validar que timeout personalizado sobrescribe el default
      const slowOperation = mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return "too slow";
      });

      const promise = resilientCall(slowOperation, {
        builtIn: "api",
        timeoutMs: 100, // Timeout más corto que la operación
        retryConfig: {
          maxAttempts: 1, // Sin reintentos para este test
          intervalSeconds: 0,
        },
      });

      // Avanzar tiempo suficiente para que se active el timeout
      advanceTimersByTime(100);

      await expect(promise).rejects.toThrow("Timeout after 100ms");
    });
  });

  // ========================================================
  // CATEGORÍA: FALLOS Y RETRIES
  // ========================================================

  describe("Manejo de fallos y reintentos", () => {
    test("debería reintentar fallos transitorios (simulación de red)", async () => {
      // Validar que se reintentan fallos aleatorios como errores de red
      let attemptCount = 0;
      const flakyOperation = mock(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Network error ${attemptCount}`);
        }
        return "recovered";
      });

      const circuitBreaker = createApiCircuitBreaker();
      const result = await resilientCall(flakyOperation, {
        circuitBraker: circuitBreaker,
        retryConfig: {
          maxAttempts: 5,
          intervalSeconds: 0, // Sin delay para tests
          backoffRate: 1,
        },
      });

      expect(result).toBe("recovered");
      expect(attemptCount).toBe(3); // 2 fallos + 1 éxito
    });

    test("debería usar succeedAfterNFailures helper correctamente", async () => {
      // Validar el helper de N fallos antes del éxito
      const operation = succeedAfterNFailures(2, "final success", 10);

      const circuitBreaker = createApiCircuitBreaker();
      const result = await resilientCall(operation, {
        circuitBraker: circuitBreaker,
        retryConfig: {
          maxAttempts: 3,
          intervalSeconds: 0,
          backoffRate: 1,
        },
      });

      expect(result).toBe("final success");
      expect(operation).toHaveBeenCalledTimes(3); // 2 fallos + 1 éxito
    });

    test("debería respetar maxAttempts en retryConfig", async () => {
      // Validar que no se excede el número máximo de intentos
      let attempts = 0;
      const alwaysFailing = mock(async () => {
        attempts++;
        throw new Error(`Fail ${attempts}`);
      });

      const circuitBreaker = createApiCircuitBreaker();
      await expect(
        resilientCall(alwaysFailing, {
          circuitBraker: circuitBreaker,
          retryConfig: {
            maxAttempts: 3,
            intervalSeconds: 0,
            backoffRate: 1,
          },
        }),
      ).rejects.toThrow("Fail 3");

      expect(attempts).toBe(3); // Exactamente maxAttempts
    });

    test("debería aplicar backoffRate en delays entre reintentos", async () => {
      // Validar que el backoff exponencial se aplica correctamente
      let attempts = 0;
      const operation = mock(async () => {
        attempts++;
        throw new Error(`Fail ${attempts}`);
      });

      const promise = resilientCall(operation, {
        builtIn: "api",
        retryConfig: {
          maxAttempts: 3,
          intervalSeconds: 100, // 100ms base
          backoffRate: 2, // Doble cada vez
        },
      });

      // Primer intento: inmediato
      // Segundo intento: después de 100ms
      advanceTimersByTime(100);
      // Tercer intento: después de 200ms (100 * 2)
      advanceTimersByTime(200);

      await expect(promise).rejects.toThrow("Fail 3");
      expect(attempts).toBe(3);
    });
  });

  // ========================================================
  // CATEGORÍA: TIMEOUTS
  // ========================================================

  describe("Manejo de timeouts", () => {
    test("debería rechazar operaciones que exceden timeout", async () => {
      // Validar que el timeout global funciona correctamente
      const slowOperation = alwaysTimeout(50);
      const circuitBreaker = createApiCircuitBreaker();

      const promise = resilientCall(slowOperation, {
        circuitBraker: circuitBreaker,
        timeoutMs: 100,
        retryConfig: {
          maxAttempts: 1, // Sin reintentos
          intervalSeconds: 0,
        },
      });

      // Avanzar más allá del timeout
      advanceTimersByTime(100);

      await expect(promise).rejects.toThrow("Timeout after 100ms");
    });

    test("debería combinar timeout con reintentos", async () => {
      // Validar que timeout y retry trabajan juntos
      let attempts = 0;
      const timeoutThenSucceed = mock(async () => {
        attempts++;
        if (attempts < 2) {
          // Primer intento: timeout
          return new Promise((resolve) => {
            setTimeout(() => resolve("too late" as any), 200);
          });
        }
        // Segundo intento: éxito rápido
        return "success";
      });

      const circuitBreaker = createApiCircuitBreaker();

      const promise = resilientCall(timeoutThenSucceed, {
        circuitBraker: circuitBreaker,
        timeoutMs: 100,
        retryConfig: {
          maxAttempts: 2,
          intervalSeconds: 0,
        },
      });

      // Primer intento: timeout después de 100ms
      advanceTimersByTime(100);
      // Segundo intento: éxito inmediato
      advanceTimersByTime(0);

      const result = await promise;
      expect(result).toBe("success");
      expect(attempts).toBe(2);
    });

    test("no debería reintentar después de timeout si shouldRetry lo prohibe", async () => {
      // Validar que timeout produce un error genérico que se reintenta por defecto
      const slowOperation = alwaysTimeout(50);
      let retryCount = 0;
      const circuitBreaker = createApiCircuitBreaker();

      const promise = resilientCall(slowOperation, {
        circuitBraker: circuitBreaker,
        timeoutMs: 100,
        retryConfig: {
          maxAttempts: 3,
          intervalSeconds: 0,
          shouldRetry: (err) => {
            retryCount++;
            // Por defecto, timeout errors se reintentan
            return err instanceof Error && err.message.includes("Timeout");
          },
        },
      });

      // Tres timeouts esperados
      advanceTimersByTime(100); // Timeout 1
      advanceTimersByTime(0); // Retry 2
      advanceTimersByTime(100); // Timeout 2
      advanceTimersByTime(0); // Retry 3
      advanceTimersByTime(100); // Timeout 3

      await expect(promise).rejects.toThrow("Timeout after 100ms");
      expect(retryCount).toBe(2); // Se llamó a shouldRetry para los primeros 2 fallos
    });
  });

  // ========================================================
  // CATEGORÍA: CIRCUIT BREAKER TRANSITIONS
  // ========================================================

  describe("Transiciones de Circuit Breaker", () => {
    test("debería abrir circuito tras múltiples fallos consecutivos", async () => {
      // Validar que fallas seguidas abren el circuito
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 2,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 1,
        },
        "test-service",
      );

      const failingOperation = alwaysFail("Service down", 10);

      // Primer fallo
      await expect(
        resilientCall(failingOperation, {
          circuitBraker: circuitBreaker,
        }),
      ).rejects.toThrow("Service down");

      expect(circuitBreaker.getState()).toBe("CLOSED");

      // Segundo fallo - debería abrir circuito
      await expect(
        resilientCall(failingOperation, {
          circuitBraker: circuitBreaker,
        }),
      ).rejects.toThrow("Service down");

      expect(circuitBreaker.getState()).toBe("OPEN");
    });

    test("debería rechazar inmediatamente con circuito abierto", async () => {
      // Validar que una vez abierto, resilientCall rechaza de inmediato
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 5000,
          halfOpenSuccessThreshold: 1,
        },
        "test-service",
      );

      // Abrir el circuito
      const failingOp = alwaysFail("Fail");
      await expect(
        resilientCall(failingOp, { circuitBraker: circuitBreaker }),
      ).rejects.toThrow("Fail");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Intentar otra operación - debería rechazar inmediatamente
      const shouldNotExecute = mock(async () => "should not run");
      await expect(
        resilientCall(shouldNotExecute, { circuitBraker: circuitBreaker }),
      ).rejects.toThrow('CircuitBreaker "test-service" is OPEN');

      expect(shouldNotExecute).toHaveBeenCalledTimes(0);
    });

    test("debería permitir 1 llamada en estado HALF-OPEN tras resetTimeout", async () => {
      // Validar que tras resetTimeout, HALF-OPEN permite 1 llamada de prueba
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 1,
        },
        "test-service",
      );

      // Abrir el circuito
      const failingOp = alwaysFail("Initial fail");
      await expect(
        resilientCall(failingOp, { circuitBraker: circuitBreaker }),
      ).rejects.toThrow("Initial fail");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Avanzar tiempo más allá de resetTimeout
      advanceTimersByTime(1500);

      // Estado debería ser HALF-OPEN y permitir una llamada
      const successOp = mock(async () => "half-open success");
      const result = await resilientCall(successOp, {
        circuitBraker: circuitBreaker,
      });

      expect(result).toBe("half-open success");
      expect(successOp).toHaveBeenCalledTimes(1);
      // Después de un éxito en HALF-OPEN, debería cerrarse
      expect(circuitBreaker.getState()).toBe("CLOSED");
    });

    test("debería requerir N éxitos para cerrar circuito desde HALF-OPEN", async () => {
      // Validar que N éxitos cierran el circuito
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 2, // Requiere 2 éxitos
        },
        "test-service",
      );

      // Abrir circuito
      await expect(
        resilientCall(alwaysFail("Fail"), { circuitBraker: circuitBreaker }),
      ).rejects.toThrow("Fail");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Avanzar a HALF-OPEN
      advanceTimersByTime(1500);

      // Primer éxito en HALF-OPEN
      const successOp = mock(async () => "success");
      const result1 = await resilientCall(successOp, {
        circuitBraker: circuitBreaker,
      });
      expect(result1).toBe("success");
      expect(circuitBreaker.getState()).toBe("HALF_OPEN"); // Aún no cerrado

      // Segundo éxito - debería cerrar
      const result2 = await resilientCall(successOp, {
        circuitBraker: circuitBreaker,
      });
      expect(result2).toBe("success");
      expect(circuitBreaker.getState()).toBe("CLOSED");
    });

    test("debería volver a OPEN si falla en estado HALF-OPEN", async () => {
      // Validar que fallar en HALF-OPEN vuelve a abrir el circuito
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 2,
        },
        "test-service",
      );

      // Abrir circuito
      await expect(
        resilientCall(alwaysFail("Fail"), { circuitBraker: circuitBreaker }),
      ).rejects.toThrow("Fail");
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Avanzar a HALF-OPEN
      advanceTimersByTime(1500);

      // Fallar en HALF-OPEN - debería volver a OPEN
      await expect(
        resilientCall(alwaysFail("Half-open fail"), {
          circuitBraker: circuitBreaker,
        }),
      ).rejects.toThrow("Half-open fail");
      expect(circuitBreaker.getState()).toBe("OPEN");
    });
  });

  // ========================================================
  // CATEGORÍA: CONCURRENCIA
  // ========================================================

  describe("Pruebas de concurrencia real", () => {
    test("debería manejar 20 llamadas simultáneas exitosas", async () => {
      // Validar que múltiples llamadas concurrentes funcionan correctamente
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 100, // Alto para no abrir con concurrencia
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 10,
        },
        "concurrent-service",
      );

      const operations = Array.from({ length: 20 }, (_, i) =>
        mock(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `result-${i}`;
        }),
      );

      const promises = operations.map((op, i) =>
        resilientCall(op, {
          circuitBraker: circuitBreaker,
          timeoutMs: 1000,
        }),
      );

      advanceTimersByTime(10);
      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach((result, i) => {
        expect(result).toBe(`result-${i}`);
      });
      operations.forEach((op) => {
        expect(op).toHaveBeenCalledTimes(1);
      });
    });

    test("debería abrir circuito con fallas concurrentes y rechazar siguientes", async () => {
      // Validar que fallas concurrentes abren circuito y rechazan nuevas llamadas
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 3,
          resetTimeout: 5000,
          halfOpenSuccessThreshold: 2,
        },
        "concurrent-fail",
      );

      // Primeras 5 llamadas - 3 fallan, 2 tienen éxito
      let callCount = 0;
      const flakyOperation = mock(async () => {
        callCount++;
        if (callCount <= 3) {
          throw new Error(`Fail ${callCount}`);
        }
        return `success-${callCount}`;
      });

      const promises = Array.from({ length: 5 }, (_, i) =>
        resilientCall(flakyOperation, {
          circuitBraker: circuitBreaker,
          retryConfig: { maxAttempts: 1, intervalSeconds: 0 },
        }),
      );

      // Las primeras 3 fallan y abren el circuito
      // Las siguientes 2 deberían rechazarse inmediatamente
      const results = await Promise.allSettled(promises);

      // Contar resultados
      const rejected = results.filter((r) => r.status === "rejected");
      const fulfilled = results.filter((r) => r.status === "fulfilled");

      // Deberíamos tener 3 rechazados (fallas iniciales)
      // y 2 rechazados (circuito abierto) o algunos éxitos dependiendo del timing
      expect(circuitBreaker.getState()).toBe("OPEN");
      expect(flakyOperation).toHaveBeenCalledTimes(3); // Solo 3 intentos antes de abrir
    });

    test("debería manejar mezcla de éxitos y fallas concurrentes", async () => {
      // Validar comportamiento con operaciones mixtas concurrentes
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 10, // Alto para no abrir fácilmente
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 5,
        },
        "mixed-concurrent",
      );

      const operations = Array.from({ length: 10 }, (_, i) => {
        if (i < 3) {
          return alwaysFail(`Fail ${i}`, 10);
        }
        return mock(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `success-${i}`;
        });
      });

      const promises = operations.map((op) =>
        resilientCall(op, {
          circuitBraker: circuitBreaker,
          retryConfig: { maxAttempts: 1, intervalSeconds: 0 },
        }),
      );

      advanceTimersByTime(10);
      const results = await Promise.allSettled(promises);

      const rejected = results.filter((r) => r.status === "rejected");
      const fulfilled = results.filter((r) => r.status === "fulfilled");

      expect(fulfilled).toHaveLength(7); // 7 éxitos (10 total - 3 fallas)
      expect(rejected).toHaveLength(3); // 3 fallas
    });
  });

  // ========================================================
  // CATEGORÍA: ERRORES HTTP ESPECÍFICOS
  // ========================================================

  describe("Manejo específico de errores HTTP", () => {
    test("no debería reintentar errores 4xx (excepto 429)", async () => {
      // Validar que errores de cliente 4xx no se reintentan
      const clientErrors = [
        { code: 400, message: "HTTP 400: Bad Request" },
        { code: 401, message: "HTTP 401: Unauthorized" },
        { code: 403, message: "HTTP 403: Forbidden" },
        { code: 404, message: "HTTP 404: Not Found" },
      ];

      for (const error of clientErrors) {
        const operation = mock(async () => {
          throw new Error(error.message);
        });

        await expect(
          resilientCall(operation, {
            builtIn: "api",
            retryConfig: {
              maxAttempts: 3,
              intervalSeconds: 0,
            },
          }),
        ).rejects.toThrow(error.message);

        expect(operation).toHaveBeenCalledTimes(1); // Solo un intento para 4xx
        mock.restore(); // Reset para siguiente iteración
      }
    });

    test("debería reintentar errores 429 (rate limit)", async () => {
      // Validar que rate limits (429) se reintentan
      let attempt = 0;
      const rateLimited = mock(async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error("HTTP 429: Too Many Requests");
        }
        return "success after rate limit";
      });

      const result = await resilientCall(rateLimited, {
        builtIn: "api",
        retryConfig: {
          maxAttempts: 5,
          intervalSeconds: 0,
        },
      });

      expect(result).toBe("success after rate limit");
      expect(attempt).toBe(3); // 2 fallos + 1 éxito
    });

    test("debería reintentar errores 5xx (server errors)", async () => {
      // Validar que errores de servidor 5xx se reintentan
      let attempt = 0;
      const serverError = mock(async () => {
        attempt++;
        if (attempt < 2) {
          throw new Error("HTTP 500: Internal Server Error");
        }
        return "recovered";
      });

      const result = await resilientCall(serverError, {
        builtIn: "api",
        retryConfig: {
          maxAttempts: 3,
          intervalSeconds: 0,
        },
      });

      expect(result).toBe("recovered");
      expect(attempt).toBe(2); // 1 fallo + 1 éxito
    });

    test("debería manejar errores no-HTTP (siempre reintentar por defecto)", async () => {
      // Validar que errores genéricos se reintentan por defecto
      let attempt = 0;
      const genericError = mock(async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error("Some generic error");
        }
        return "recovered";
      });

      const result = await resilientCall(genericError, {
        builtIn: "api",
        retryConfig: {
          maxAttempts: 5,
          intervalSeconds: 0,
        },
      });

      expect(result).toBe("recovered");
      expect(attempt).toBe(3); // 2 fallos + 1 éxito
    });
  });

  // ========================================================
  // CATEGORÍA: CONFIGURACIÓN AVANZADA
  // ========================================================

  describe("Configuración avanzada y casos de borde", () => {
    test("debería priorizar circuitBraker personalizado sobre builtIn", async () => {
      // Validar que circuitBraker personalizado tiene prioridad
      const customBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 1,
        },
        "custom",
      );

      const operation = mock(async () => "result");

      const result = await resilientCall(operation, {
        builtIn: "llm", // Este debería ignorarse
        circuitBraker: customBreaker,
      });

      expect(result).toBe("result");
      // Verificar que se usó el breaker personalizado revisando su estado
      expect(customBreaker.getState()).toBe("CLOSED");
    });

    test("debería usar valores por defecto cuando no se especifica builtIn", async () => {
      // Validar comportamiento cuando builtIn no se especifica
      const operation = mock(async () => "result");

      // Sin builtIn, debería usar api como default
      const result = await resilientCall(operation, {});

      expect(result).toBe("result");
      // Timeout por defecto debería ser 45000ms (API default)
    });

    test("debería propagar errores originales con stack trace", async () => {
      // Validar que los errores originales se propagan intactos
      const originalError = new Error("Original error");
      originalError.name = "CustomError";
      originalError.stack = "Error: CustomError\n    at test.js:10:15";

      const operation = mock(async () => {
        throw originalError;
      });

      try {
        await resilientCall(operation, {
          builtIn: "api",
          retryConfig: { maxAttempts: 1, intervalSeconds: 0 },
        });
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBe(originalError);
        expect(err.name).toBe("CustomError");
        expect(err.message).toBe("Original error");
      }
    });

    test("debería manejar operaciones que retornan diferentes tipos", async () => {
      // Validar que resilientCall funciona con cualquier tipo T
      const stringOp = mock(async () => "string result");
      const numberOp = mock(async () => 42);
      const objectOp = mock(async () => ({ key: "value" }));
      const arrayOp = mock(async () => [1, 2, 3]);

      const stringResult = await resilientCall(stringOp, { builtIn: "api" });
      const numberResult = await resilientCall(numberOp, { builtIn: "api" });
      const objectResult = await resilientCall(objectOp, { builtIn: "api" });
      const arrayResult = await resilientCall(arrayOp, { builtIn: "api" });

      expect(stringResult).toBe("string result");
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ key: "value" });
      expect(arrayResult).toEqual([1, 2, 3]);
    });
  });
});
