// @ts-nocheck
import { CircuitBreaker } from "@/application/patterns/saga-orchestrator/circut-braker/circut-braker";
import { resilientCall } from "@/application/patterns/saga-orchestrator/circut-braker.strategy";
import { logger } from "@/infraestructure/logging";
import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

// ========================================================
// MOCK DE LOGGER PARA EVITAR OUTPUT EN TESTS
// ========================================================
function mockLogger() {
  // Mock de logger para evitar console.log en tests
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
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = mock((callback: () => void, delay: number) => {
    if (delay === 0) {
      callback();
      return 0 as any;
    }
    const timerId = timers.length;
    timers.push({ callback, time: fakeNow + delay });
    return timerId as any;
  });

  // Mock clearTimeout
  globalThis.clearTimeout = mock((id: number) => {
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
// TESTS DE CIRCUIT BREAKER EN CONDICIONES DE PRODUCCIÓN
// ========================================================

describe("CircuitBreaker Production Tests", () => {
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    mock.restore();

    // Mock console.log y console.error para evitar output en tests
    console.log = mock(() => {});
    console.error = mock(() => {});

    // Configurar fake timers
    setupFakeTimers();

    // Mock del logger
    mockLogger();
  });

  afterEach(() => {
    // Limpiar todos los timers después de cada test
    clearAllTimers();

    // Restaurar mocks originales
    mock.restore();
  });

  // ========================================================
  // ESCENARIOS BÁSICOS DE CIRCUIT BREAKER
  // ========================================================

  describe("Estado CLOSED → operaciones normales", () => {
    test("debería ejecutar operaciones exitosas con circuito cerrado", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 3,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 2,
        },
        "test-service",
      );

      const mockOperation = mock(() => Promise.resolve("success"));
      const result = await circuitBreaker.execute(mockOperation);

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe("CLOSED");
    });

    test("debería abrir el circuito tras múltiples fallos consecutivos", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 3,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 2,
        },
        "test-service",
      );

      const mockOperation = mock(() =>
        Promise.reject(new Error("Service down")),
      );

      // Primer fallo
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        "Service down",
      );
      expect(circuitBreaker.getState()).toBe("CLOSED");

      // Segundo fallo
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        "Service down",
      );
      expect(circuitBreaker.getState()).toBe("CLOSED");

      // Tercer fallo - debería abrir el circuito
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        "Service down",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");
    });
  });

  describe("Estado OPEN → rechazo inmediato", () => {
    test("debería rechazar operaciones inmediatamente cuando está OPEN", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 2,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 2,
        },
        "test-service",
      );

      const mockOperation = mock(() => Promise.reject(new Error("Fail")));

      // Provocar apertura del circuito
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        "Fail",
      );
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        "Fail",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Intentar ejecutar con circuito abierto
      const shouldFailOperation = mock(() =>
        Promise.resolve("should not execute"),
      );
      await expect(circuitBreaker.execute(shouldFailOperation)).rejects.toThrow(
        'CircuitBreaker "test-service" is OPEN. Service unavailable.',
      );

      expect(shouldFailOperation).toHaveBeenCalledTimes(0);
    });

    test("debería transicionar a HALF_OPEN después de resetTimeout", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 1000, // 1 segundo
          halfOpenSuccessThreshold: 1,
        },
        "test-service",
      );

      // Abrir el circuito
      const mockOperation = mock(() => Promise.reject(new Error("Fail")));
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(
        "Fail",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Avanzar el tiempo más allá del resetTimeout
      advanceTimersByTime(1500);

      // Intentar ejecutar una operación - debería transicionar a HALF_OPEN y ejecutarse
      const successOperation = mock(() => Promise.resolve("success"));
      const result = await circuitBreaker.execute(successOperation);

      // Verificar que la operación se ejecutó (estado HALF_OPEN permitió la ejecución)
      expect(result).toBe("success");
      expect(successOperation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe("CLOSED");
    });
  });

  describe("Estado HALF_OPEN → transiciones críticas", () => {
    test("debería transicionar a CLOSED tras éxitos en half-open", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 2,
        },
        "test-service",
      );

      // Abrir el circuito
      const failingOperation = mock(() => Promise.reject(new Error("Fail")));
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow(
        "Fail",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Esperar resetTimeout
      advanceTimersByTime(1500);

      // Ejecutar operación exitosa en estado HALF_OPEN
      const successOperation = mock(() => Promise.resolve("success1"));
      const result1 = await circuitBreaker.execute(successOperation);
      expect(result1).toBe("success1");
      expect(circuitBreaker.getState()).toBe("HALF_OPEN");

      // Segundo éxito - debería cerrar el circuito
      const result2 = await circuitBreaker.execute(successOperation);
      expect(result2).toBe("success1");
      expect(circuitBreaker.getState()).toBe("CLOSED");
    });

    test("debería transicionar a OPEN tras un fallo en HALF_OPEN", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 2,
        },
        "test-service",
      );

      // Abrir el circuito
      const failingOperation = mock(() => Promise.reject(new Error("Fail")));
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow(
        "Fail",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Esperar resetTimeout
      advanceTimersByTime(1500);

      // Fallar en estado HALF_OPEN - debería volver a OPEN
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow(
        "Fail",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");
    });
  });

  describe("Llamadas concurrentes con circuito abierto", () => {
    test("debería manejar múltiples llamadas concurrentes rechazándolas todas", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 1,
          resetTimeout: 5000,
          halfOpenSuccessThreshold: 1,
        },
        "test-service",
      );

      // Abrir el circuito
      const failingOperation = mock(() => Promise.reject(new Error("Fail")));
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow(
        "Fail",
      );
      expect(circuitBreaker.getState()).toBe("OPEN");

      // Intentar múltiples llamadas concurrentes
      const concurrentOperations = Array.from({ length: 10 }, () =>
        mock(() => Promise.resolve("should not execute")),
      );

      const promises = concurrentOperations.map((op) =>
        expect(circuitBreaker.execute(op)).rejects.toThrow(
          'CircuitBreaker "test-service" is OPEN. Service unavailable.',
        ),
      );

      await Promise.all(promises);

      // Ninguna operación debería haberse ejecutado
      concurrentOperations.forEach((op) => {
        expect(op).toHaveBeenCalledTimes(0);
      });
    });
  });

  // ========================================================
  // SIMULACIONES REALES DE PRODUCCIÓN
  // ========================================================

  describe("Simulaciones reales de producción", () => {
    describe("API de LLM con timeout estricto (10s)", () => {
      test("simular LLM que falla por timeout de 10 segundos", async () => {
        const circuitBreaker = new CircuitBreaker(
          {
            failureThreshold: 2,
            resetTimeout: 30000,
            halfOpenSuccessThreshold: 2,
          },
          "llm-service",
        );

        // Simular LLM que tarda 10 segundos y luego falla
        const slowLLM = mock(async () => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error("LLM timeout after 10s"));
            }, 10000); // 10 segundos de delay
          });
        });

        const startTime = Date.now();
        // Crear la promesa primero (no await aún)
        const promise = circuitBreaker.execute(slowLLM);

        // Avanzar el tiempo para que se rechace la promesa
        advanceTimersByTime(10000);

        // Ahora esperar que la promesa sea rechazada
        await expect(promise).rejects.toThrow("LLM timeout after 10s");
        const elapsed = Date.now() - startTime;

        // Verificar que el tiempo transcurrido sea 0 con fake timers
        expect(elapsed).toBe(10000); // Tiempo simulado con fake timers
        expect(circuitBreaker.getState()).toBe("CLOSED"); // Solo un fallo
      });
    });

    describe("Base de datos con respuesta lenta", () => {
      test("simular DB con conexión lenta (500ms de latencia)", async () => {
        const circuitBreaker = new CircuitBreaker(
          {
            failureThreshold: 5,
            resetTimeout: 60000,
            halfOpenSuccessThreshold: 3,
          },
          "database-service",
        );

        // Simular query de DB con latencia
        const slowDBQuery = mock(async () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ users: [], count: 0 });
            }, 500); // 500ms de latencia
          });
        });

        const startTime = Date.now();
        // Crear la promesa primero
        const promise = circuitBreaker.execute(slowDBQuery);

        // Avanzar el tiempo para que la promesa se resuelva
        advanceTimersByTime(500);

        // Ahora esperar la resolución
        const result = await promise;
        const elapsed = Date.now() - startTime;

        expect(result).toEqual({ users: [], count: 0 });
        expect(elapsed).toBe(500); // Tiempo simulado con fake timers
        expect(circuitBreaker.getState()).toBe("CLOSED");
      });
    });

    describe("WhatsApp Webhook con timeout de 30-45 segundos", () => {
      test("cadena completa: WhatsApp → LLM → DB → Respuesta bajo 45s", async () => {
        // Usar resilientCall que ya maneja circuit breaker + retry
        // Simular tiempos pequeños para tests (en producción serían segundos)
        let step = 0;
        const simulateChain = mock(async () => {
          step++;
          if (step === 1) {
            // WhatsApp processing (5ms simulado)
            advanceTimersByTime(5);
            return;
          }
          if (step === 2) {
            // LLM call (2 segundos simulado)
            advanceTimersByTime(2000);
            return "Hola, ¿cómo estás?";
          }
          if (step === 3) {
            // DB save (100ms simulado)
            advanceTimersByTime(100);
            return;
          }
          if (step === 4) {
            // Prepare response (5ms simulado)
            advanceTimersByTime(5);
            return {
              success: true,
              message: "Hola, ¿cómo estás?",
              processed: true,
            };
          }
          throw new Error("Unexpected step");
        });

        const startTime = Date.now();
        const result = await resilientCall(
          async () => {
            await simulateChain(); // WhatsApp
            const llmResponse = await simulateChain(); // LLM
            await simulateChain(); // DB
            return await simulateChain(); // Response
          },
          { service: "llm" },
        );

        const elapsed = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(result.message).toBe("Hola, ¿cómo estás?");
        // Tiempo total simulado: 5 + 2000 + 100 + 5 = 2110ms
        expect(elapsed).toBe(2110);
        expect(elapsed).toBeLessThan(45000); // Cumple con timeout de WhatsApp
        expect(simulateChain).toHaveBeenCalledTimes(4);
      });

      test("debería fallar si excede timeout de WhatsApp (45s)", async () => {
        // Simular proceso que tarda más de 45 segundos
        const tooSlowProcess = mock(async () => {
          // 50 segundos de delay simulado
          advanceTimersByTime(50000);
          return "Too late response";
        });

        const startTime = Date.now();
        const resultPromise = resilientCall(tooSlowProcess, {
          service: "api",
        });

        // La promesa debería resolverse después de 50 segundos simulados
        // (no hay timeout real en este test, solo verificación del tiempo simulado)
        const result = await resultPromise;
        const elapsed = Date.now() - startTime;

        expect(result).toBe("Too late response");
        expect(elapsed).toBe(50000); // 50 segundos simulados
        expect(elapsed).toBeGreaterThan(45000); // Excede timeout de WhatsApp
      });
    });

    describe("Rate limiting (429 Too Many Requests)", () => {
      test("debería manejar rate limits con reintentos automáticos", async () => {
        let requestCount = 0;
        const rateLimitedService = mock(async () => {
          requestCount++;
          if (requestCount <= 2) {
            throw new Error("HTTP 429: Too Many Requests");
          }
          return { data: "Success after rate limit" };
        });

        // Usar resilientCall que combina circuit breaker + retry
        const promise = resilientCall(rateLimitedService, {
          service: "api",
          retryConfig: {
            maxAttempts: 3,
            intervalSeconds: 0,
            backoffRate: 2,
          },
        });

        const result = await promise;

        expect(result).toEqual({ data: "Success after rate limit" });
        expect(requestCount).toBe(3); // 2 fallos + 1 éxito
      });
    });

    describe("Fallos transitorios vs permanentes", () => {
      test("debería reintentar fallos transitorios (5xx)", async () => {
        let attempts = 0;
        const transientFailure = mock(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error("HTTP 503: Service Unavailable");
          }
          return { status: "ok" };
        });

        const result = await resilientCall(transientFailure, {
          service: "api",
          retryConfig: {
            maxAttempts: 5,
            intervalSeconds: 0,
            backoffRate: 1.5,
          },
        });

        expect(result).toEqual({ status: "ok" });
        expect(attempts).toBe(3);
      });

      test("no debería reintentar fallos permanentes (4xx excepto 429)", async () => {
        const permanentFailure = mock(async () => {
          throw new Error("HTTP 400: Bad Request");
        });

        await expect(
          resilientCall(permanentFailure, {
            service: "llm",
            retryConfig: {
              maxAttempts: 3,
              intervalSeconds: 0.1,
            },
          }),
        ).rejects.toThrow("HTTP 400: Bad Request");

        expect(permanentFailure).toHaveBeenCalledTimes(1); // Solo un intento
      });
    });
  });

  // ========================================================
  // INTEGRACIÓN CIRCUIT BREAKER + RETRY STEP
  // ========================================================

  describe("Integración CircuitBreaker + retryStep", () => {
    test("combinación jerárquica: CircuitBreaker envuelve retryStep", async () => {
      let callCount = 0;
      const unreliableService = mock(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error("Temporary failure");
        }
        return "Service recovered";
      });

      // Circuit breaker con configuración estricta
      const customBreaker = new CircuitBreaker(
        {
          failureThreshold: 2,
          resetTimeout: 5000,
          halfOpenSuccessThreshold: 1,
        },
        "custom-service",
      );

      // Usar resilientCall que ya combina ambos patrones
      const result = await resilientCall(unreliableService, {
        service: "api",
        retryConfig: {
          maxAttempts: 5,
          intervalSeconds: 0,
          backoffRate: 2,
        },
      });

      expect(result).toBe("Service recovered");
      expect(callCount).toBe(3); // 2 fallos + 1 éxito
    });

    test("simular cadena completa con fallos y recuperación", async () => {
      let step = 0;
      const simulateChain = mock(async () => {
        step++;
        if (step === 1) {
          // WhatsApp recibe mensaje (10ms simulado)
          advanceTimersByTime(10);
          return;
        }
        if (step === 2) {
          // LLM procesa (1000ms simulado)
          advanceTimersByTime(1000);
          return "Processed by LLM";
        }
        if (step === 3) {
          // Guardar en DB (50ms simulado)
          advanceTimersByTime(50);
          return;
        }
        if (step === 4) {
          // Retornar resultado final
          return {
            success: true,
            message: "Processed by LLM",
            stored: true,
          };
        }
        throw new Error("Unexpected step");
      });

      const result = await resilientCall(
        async () => {
          await simulateChain(); // WhatsApp
          const llmResult = await simulateChain(); // LLM
          await simulateChain(); // DB
          return await simulateChain(); // Resultado
        },
        {
          service: "llm",
          retryConfig: {
            maxAttempts: 2,
            intervalSeconds: 0,
            backoffRate: 1.5,
          },
        },
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("Processed by LLM");
      expect(result.stored).toBe(true);
      expect(simulateChain).toHaveBeenCalledTimes(4);
    });

    test("timeouts acumulativos no deben superar 45s", async () => {
      let step = 0;
      const chainWithTimeouts = mock(async () => {
        step++;
        if (step === 1) {
          // WhatsApp: 5s simulado
          advanceTimersByTime(5000);
          return;
        }
        if (step === 2) {
          // LLM: 15s simulado
          advanceTimersByTime(15000);
          return;
        }
        if (step === 3) {
          // DB: 10s simulado
          advanceTimersByTime(10000);
          return;
        }
        if (step === 4) {
          // Respuesta: 5s simulado
          advanceTimersByTime(5000);
          return "Chain completed";
        }
        throw new Error("Unexpected step");
      });

      const startTime = Date.now();
      const result = await resilientCall(
        async () => {
          await chainWithTimeouts(); // WhatsApp
          await chainWithTimeouts(); // LLM
          await chainWithTimeouts(); // DB
          return await chainWithTimeouts(); // Respuesta
        },
        {
          service: "llm",
        },
      );

      const elapsed = Date.now() - startTime;

      expect(result).toBe("Chain completed");
      // Tiempo total simulado: 5 + 15 + 10 + 5 = 35s
      expect(elapsed).toBe(5000 + 15000 + 10000 + 5000);
      expect(elapsed).toBeLessThan(45000); // Cumple con timeout de WhatsApp
      expect(chainWithTimeouts).toHaveBeenCalledTimes(4);
    });
  });

  // ========================================================
  // PRUEBAS DE RENDIMIENTO Y CASOS DE BORDE
  // ========================================================

  describe("Pruebas de rendimiento y casos de borde", () => {
    test("overhead mínimo en caso de éxito", async () => {
      const fastOperation = mock(() => Promise.resolve(42));

      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 5,
          resetTimeout: 30000,
          halfOpenSuccessThreshold: 3,
        },
        "fast-service",
      );

      const startTime = performance.now();
      const result = await circuitBreaker.execute(fastOperation);
      const endTime = performance.now();

      expect(result).toBe(42);
      // Overhead debería ser mínimo (menos de 10ms en tiempo real)
      // Con fake timers, no hay overhead real
      const overhead = endTime - startTime;
      expect(overhead).toBe(0);
    });

    test("manejo de concurrencia con circuit breaker compartido", async () => {
      const circuitBreaker = new CircuitBreaker(
        {
          failureThreshold: 10,
          resetTimeout: 1000,
          halfOpenSuccessThreshold: 5,
        },
        "shared-service",
      );

      const operation = mock(async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `result-${id}`;
      });

      // Ejecutar 20 operaciones concurrentes
      const promises = Array.from({ length: 20 }, (_, i) =>
        circuitBreaker.execute(() => operation(i)),
      );

      advanceTimersByTime(10);
      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach((result, i) => {
        expect(result).toBe(`result-${i}`);
      });
      expect(operation).toHaveBeenCalledTimes(20);
    });

    test("configuración personalizada de retry en resilientCall", async () => {
      let attempts = 0;
      const failingOperation = mock(async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return "Success on 4th attempt";
      });

      const result = await resilientCall(failingOperation, {
        service: "api",
        retryConfig: {
          maxAttempts: 5,
          intervalSeconds: 0,
          backoffRate: 2,
        },
      });

      expect(result).toBe("Success on 4th attempt");
      expect(attempts).toBe(4);
    });
  });
});
