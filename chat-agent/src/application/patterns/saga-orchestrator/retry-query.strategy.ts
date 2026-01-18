import { StepConfig } from "@dbos-inc/dbos-sdk";

export interface RetryConfig extends Omit<StepConfig, "name"> {
  shouldRetry?: (err: unknown) => boolean;
}

export const retryConfig = {
  maxAttempts: 3,
  intervalSeconds: 1.5,
  backoffRate: 1.5,
  shouldRetry: (_err: unknown) => true,
} satisfies RetryConfig;

export interface FuncRetryStep {
  <R>(func: () => Promise<R>, config?: RetryConfig): Promise<R>;
}

/**
 * RetryStep: ejecuta func() con reintentos.
 * No usa DBOS ni hace escrituras. Ideal para IO liviano (fetch, Redis, etc.)
 */
export async function retryQuery<R>(
  func: () => Promise<R>,
  {
    maxAttempts = 3,
    intervalSeconds = 1.5,
    backoffRate = 1.5,
    shouldRetry = (_err: unknown) => true, // Predicado opcional: por defecto reintenta siempre
  },
): Promise<R> {
  let attempt = 1; // Empieza en 1 para hacerlo más intuitivo

  while (true) {
    try {
      return await func();
    } catch (err) {
      // Verificar si debemos reintentar basado en el error
      if (!shouldRetry(err) || attempt >= maxAttempts) {
        throw err;
      }
      const delay = intervalSeconds * 1000 * Math.pow(backoffRate, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
}
