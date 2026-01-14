import { retryStep } from "./retry-step.strategy";
import { CircuitBreaker } from "../circut-braker/circut-braker";

// En saga-orchestrator-dbos.ts
export interface CircuitBreakerStep {
  <R>(func: () => Promise<R>, breakerName: string): Promise<R>;
}

// Circuit breakers por servicio (singleton)
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(name: string): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(
      name,
      new CircuitBreaker(
        {
          failureThreshold: 5, // 5 fallos abren el circuito
          resetTimeout: 30000, // 30 segundos antes de half-open
          halfOpenSuccessThreshold: 2, // 2 éxitos para cerrar
        },
        name,
      ),
    );
  }
  return circuitBreakers.get(name)!;
}

// Nueva función para combinar circuit breaker + retry
export async function resilientStep<R>(
  func: () => Promise<R>,
  options: {
    breakerName: string;
    maxAttempts?: number;
    intervalSeconds?: number;
    shouldRetry?: (err: unknown) => boolean;
  },
): Promise<R> {
  const breaker = getCircuitBreaker(options.breakerName);

  return breaker.execute(() =>
    retryStep(func, {
      maxAttempts: options.maxAttempts,
      intervalSeconds: options.intervalSeconds,
      shouldRetry: (err) => {
        // Solo reintentar si el breaker está cerrado/half-open
        if (!breaker.isAvailable()) return false;
        // Luego aplicar la lógica normal de shouldRetry
        return options.shouldRetry ? options.shouldRetry(err) : true;
      },
    }),
  );
}
