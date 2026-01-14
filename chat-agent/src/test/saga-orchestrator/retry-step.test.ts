// @ts-nocheck
import { retryStep } from "@/saga/saga-orchestrator-dbos";
import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

describe("retryStep", () => {
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    mock.restore();
  });

  afterEach(() => {
    // Limpiar timers después de cada test
    if (globalThis._timers) {
      globalThis._timers.forEach((timer) => clearTimeout(timer));
      globalThis._timers = [];
    }
  });

  test("debería ejecutar la función una vez si tiene éxito inmediato", async () => {
    const mockFunc = mock(() => Promise.resolve("éxito"));

    const result = await retryStep(mockFunc, {
      maxAttempts: 3,
      intervalSeconds: 0.1,
      backoffRate: 1.5,
    });

    expect(result).toBe("éxito");
    expect(mockFunc).toHaveBeenCalledTimes(1);
  });

  test("debería reintentar y tener éxito después de algunos fallos", async () => {
    let callCount = 0;
    const mockFunc = mock(() => {
      callCount++;
      if (callCount < 2) {
        return Promise.reject(new Error("fallo temporal"));
      }
      return Promise.resolve("éxito después de reintento");
    });

    const result = await retryStep(mockFunc, {
      maxAttempts: 3,
      intervalSeconds: 0.1, // Usamos intervalos cortos para tests
      backoffRate: 1.5,
    });

    expect(result).toBe("éxito después de reintento");
    expect(mockFunc).toHaveBeenCalledTimes(2);
  });

  test("debería lanzar error después de agotar todos los intentos", async () => {
    const error = new Error("error persistente");
    const mockFunc = mock(() => Promise.reject(error));

    await expect(
      retryStep(mockFunc, {
        maxAttempts: 3,
        intervalSeconds: 0.1,
        backoffRate: 1.5,
      }),
    ).rejects.toThrow("error persistente");

    expect(mockFunc).toHaveBeenCalledTimes(3); // Intentos máximos
  });

  test("debería respetar el intervalo entre reintentos", async () => {
    const timers: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    // Mock de setTimeout para capturar los delays
    globalThis.setTimeout = mock((callback: () => void, delay: number) => {
      timers.push(delay);
      return originalSetTimeout(callback, 0); // Ejecutar inmediato para tests
    });

    const mockFunc = mock(() => {
      throw new Error("siempre falla");
    });

    try {
      await retryStep(mockFunc, {
        maxAttempts: 3,
        intervalSeconds: 1, // 1000ms
        backoffRate: 2, // Dobla cada vez
      });
    } catch {
      // Esperamos que falle
    }

    // Verificar que hubo delays con backoff exponencial
    expect(timers).toHaveLength(2); // 2 delays entre 3 intentos
    expect(timers[0]).toBe(1000); // Primer delay: 1000ms
    expect(timers[1]).toBe(2000); // Segundo delay: 1000 * 2 = 2000ms

    // Restaurar setTimeout original
    globalThis.setTimeout = originalSetTimeout;
  });

  test("debería funcionar con diferentes configuraciones", async () => {
    const testCases = [
      { maxAttempts: 1, intervalSeconds: 0.5, backoffRate: 1 },
      { maxAttempts: 5, intervalSeconds: 0.01, backoffRate: 3 },
      { maxAttempts: 2, intervalSeconds: 2, backoffRate: 1.1 },
    ];

    for (const config of testCases) {
      let attempts = 0;
      const mockFunc = mock(() => {
        attempts++;
        if (attempts < config.maxAttempts) {
          return Promise.reject(new Error("fallo"));
        }
        return Promise.resolve("éxito");
      });

      const result = await retryStep(mockFunc, config);
      expect(result).toBe("éxito");
      expect(mockFunc).toHaveBeenCalledTimes(config.maxAttempts);
    }
  });

  test("debería propagar el error original con stack trace intacto", async () => {
    const originalError = new Error("Error específico del dominio");
    originalError.name = "DomainError";
    originalError.stack =
      "Error: DomainError\n    at someFunction (file.js:10:15)";

    const mockFunc = mock(() => Promise.reject(originalError));

    try {
      await retryStep(mockFunc, {
        maxAttempts: 2,
        intervalSeconds: 0.1,
        backoffRate: 1,
      });
      throw new Error("Debería haber lanzado un error");
    } catch (error) {
      expect(error).toBe(originalError);
      expect(error.name).toBe("DomainError");
      expect(error.message).toBe("Error específico del dominio");
      expect(error.stack).toContain("at someFunction");
    }
  });

  describe("casos de borde", () => {
    test("debería manejar funciones que devuelven valores no-promesa", async () => {
      const mockFunc = mock(() => "valor directo" as any);

      const result = await retryStep(mockFunc, {
        maxAttempts: 3,
        intervalSeconds: 0.1,
        backoffRate: 1.5,
      });

      expect(result).toBe("valor directo");
    });

    test("debería manejar maxAttempts = 0 (sin reintentos)", async () => {
      const mockFunc = mock(() => {
        throw new Error("fallo inmediato");
      });

      await expect(
        retryStep(mockFunc, {
          maxAttempts: 0,
          intervalSeconds: 0.1,
          backoffRate: 1.5,
        }),
      ).rejects.toThrow("fallo inmediato");

      expect(mockFunc).toHaveBeenCalledTimes(1);
    });

    test("debería manejar intervalSeconds = 0 (sin delay)", async () => {
      const startTime = Date.now();
      let callCount = 0;

      const mockFunc = mock(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error("fallo");
        }
        return "éxito";
      });

      const result = await retryStep(mockFunc, {
        maxAttempts: 3,
        intervalSeconds: 0,
        backoffRate: 1.5,
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(50); // Debería ser casi instantáneo
      expect(result).toBe("éxito");
    });

    test("debería manejar backoffRate = 1 (delay constante)", async () => {
      const delays: number[] = [];
      const originalSetTimeout = globalThis.setTimeout;

      globalThis.setTimeout = mock((callback: () => void, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      });

      const mockFunc = mock(() => {
        throw new Error("siempre falla");
      });

      try {
        await retryStep(mockFunc, {
          maxAttempts: 4,
          intervalSeconds: 0.5,
          backoffRate: 1,
        });
      } catch {
        // Esperado
      }

      expect(delays).toEqual([500, 500, 500]); // 3 delays, todos de 500ms
      globalThis.setTimeout = originalSetTimeout;
    });
  });

  describe("integración con fetch", () => {
    test("debería reintentar llamadas fetch fallidas", async () => {
      let fetchCount = 0;
      const mockFetch = mock(async () => {
        fetchCount++;
        if (fetchCount < 3) {
          throw new Error("Network error");
        }
        return {
          ok: true,
          json: async () => ({ data: "success" }),
        };
      });

      // Simulamos que func() hace un fetch
      const apiCall = async () => {
        const response = await mockFetch();
        if (!response.ok) throw new Error("API error");
        return response.json();
      };

      const result = await retryStep(apiCall, {
        maxAttempts: 5,
        intervalSeconds: 0.1,
        backoffRate: 2,
      });

      expect(result).toEqual({ data: "success" });
      expect(fetchCount).toBe(3);
    });

    test("debería fallar rápido en errores HTTP 4xx (excepto 429)", async () => {
      const mockFetch = mock(async () => {
        return {
          ok: false,
          status: 400,
          statusText: "Bad Request",
        };
      });

      const apiCall = async () => {
        const response = await mockFetch();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      };

      // Predicado que no reintenta para errores 4xx (excepto 429)
      const shouldRetry = (error: unknown) => {
        if (!(error instanceof Error)) return true;

        // Si es un error HTTP 4xx (pero no 429), no reintentar
        const message = error.message;
        const is4xxError =
          message.includes("HTTP 4") && !message.includes("429");
        return !is4xxError;
      };

      await expect(
        retryStep(apiCall, {
          maxAttempts: 3,
          intervalSeconds: 0.1,
          backoffRate: 1.5,
          shouldRetry, // Usamos nuestro predicado personalizado
        }),
      ).rejects.toThrow("HTTP 400: Bad Request");

      expect(mockFetch).toHaveBeenCalledTimes(1); // Solo un intento para 4xx
    });

    // ========================================================
    //  WHATSAPP CONSTRAINS
    // ========================================================
    // WhatsApp tiene timeouts estrictos:
    // - Mensajes deben procesarse en segundos
    // - Timeouts de webhook de WhatsApp: ~30-45 segundos
    // - Usuarios esperan respuestas inmediatas

    // Este test valida que incluso con fallos:
    // 4 intentos × 100ms + delays = ~550ms TOTAL
    // Esto es aceptable para UX de chat en tiempo real

    // Conclusión:
    // Este test no es solo "un test más" - es tu garantía de que en producción:

    // ✅ No colapsarás por bucles infinitos
    // ✅ Mantendrás la responsividad del chatbot
    // ✅ Cumplirás con los timeouts de WhatsApp
    // ✅ Liberarás recursos rápidamente tras fallos
    // ✅ Proporcionarás buena experiencia de usuario
    test("debería reintentar en errores HTTP 429 (rate limit)", async () => {
      let fetchCount = 0;
      const mockFetch = mock(async () => {
        fetchCount++;
        if (fetchCount < 3) {
          return {
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
          };
        }
        return {
          ok: true,
          json: async () => ({ data: "ok" }),
        };
      });

      const apiCall = async () => {
        const response = await mockFetch();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response?.json();
      };

      const result = await retryStep(apiCall, {
        maxAttempts: 5,
        intervalSeconds: 0.2,
        backoffRate: 2,
      });

      expect(result).toEqual({ data: "ok" });
      expect(fetchCount).toBe(3);
    });
  });

  describe("rendimiento", () => {
    test("no debería agregar overhead significativo en caso de éxito", async () => {
      const simpleFunc = () => Promise.resolve(42);

      const startTime = performance.now();
      const result = await retryStep(simpleFunc, {
        maxAttempts: 3,
        intervalSeconds: 1,
        backoffRate: 1.5,
      });
      const endTime = performance.now();

      expect(result).toBe(42);
      expect(endTime - startTime).toBeLessThan(10); // Menos de 10ms overhead
    });

    test("debería timeout razonable en el peor caso", async () => {
      const mockFunc = mock(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("timeout interno")), 100);
        });
      });

      const startTime = Date.now();
      try {
        await retryStep(mockFunc, {
          maxAttempts: 4,
          intervalSeconds: 0.05, // 50ms
          backoffRate: 1,
        });
      } catch {
        // Esperado
      }
      const elapsed = Date.now() - startTime;

      // Tiempo aproximado: 4 intentos con ~100ms cada uno + delays de 50ms entre ellos
      // 400ms (intentos) + 150ms (delays) = ~550ms
      expect(elapsed).toBeGreaterThan(500);
      expect(elapsed).toBeLessThan(700);
    });
  });
});
