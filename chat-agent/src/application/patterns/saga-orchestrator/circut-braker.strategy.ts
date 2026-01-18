import { retryStep } from "./retry-step.strategy";
import { CircuitBreaker } from "./circut-braker/circut-braker";

// Configuración específica para LLMs
const llmCircuitBreaker = new CircuitBreaker(
  {
    failureThreshold: 3, // 3 fallos seguidos abren el circuito
    resetTimeout: 30000, // 30 segundos en OPEN
    halfOpenSuccessThreshold: 2, // 2 éxitos para cerrar
  },
  "llm-service",
);

// Configuración específica para APIs externas
const apiCircuitBreaker = new CircuitBreaker(
  {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minuto
    halfOpenSuccessThreshold: 3,
  },
  "external-api",
);

export interface ResilientCallOptions {
  builtIn?: "llm" | "api" | "database";
  circuitBraker?: CircuitBreaker;
  timeoutMs?: number; // 👈 NUEVO: timeout global
  retryConfig?: {
    maxAttempts?: number;
    intervalSeconds?: number;
    backoffRate?: number;
  };
}

// Función unificada que combina ambos patrones
export async function resilientCall<T>(
  operation: () => Promise<T>,
  options: ResilientCallOptions,
): Promise<T> {
  //
  const timeoutMs =
    options.timeoutMs ?? (options.builtIn === "llm" ? 30000 : 45000); // WhatsApp: 30s LLM, 45s API

  const circuitBreaker = options.circuitBraker
    ? options.circuitBraker
    : options.builtIn === "llm"
      ? llmCircuitBreaker
      : apiCircuitBreaker;

  const retryConfig = {
    maxAttempts:
      options.retryConfig?.maxAttempts ?? (options.builtIn === "llm" ? 2 : 3),
    intervalSeconds:
      options.retryConfig?.intervalSeconds ??
      (options.builtIn === "llm" ? 1 : 1.5),
    backoffRate:
      options.retryConfig?.backoffRate ?? (options.builtIn === "llm" ? 1.5 : 2),
    shouldRetry: (err: unknown) => {
      // No reintentar para errores del cliente (4xx excepto 429)
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        const is4xx =
          msg.includes("400") ||
          msg.includes("401") ||
          msg.includes("403") ||
          msg.includes("404");
        const is429 = msg.includes("429");
        const is5xx =
          msg.includes("500") || msg.includes("502") || msg.includes("503");

        if (is4xx && !is429) return false; // No reintentar errores del cliente
        if (is5xx) return true; // Reintentar errores del servidor
        if (is429) return true; // Reintentar rate limits
      }
      return true;
    },
  };

  // EJECUCIÓN JERÁRQUICA: CircuitBreaker → Retry → Operación
  return circuitBreaker.execute(async () => {
    return retryStep(
      () =>
        Promise.race([
          operation(),
          new Promise<T>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
              timeoutMs,
            ),
          ),
        ]),
      retryConfig,
    );
  });
}
