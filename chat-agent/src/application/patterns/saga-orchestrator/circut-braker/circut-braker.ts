import { logger } from "@/infraestructure/logging";

// circuit-breaker.ts
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold: number; // Fallos para abrir (ej: 5)
  resetTimeout: number; // ms antes de half-open (ej: 30000)
  halfOpenSuccessThreshold?: number; // Éxitos para cerrar (ej: 3)
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenSuccessCount = 0; // 1768708068122

  constructor(
    private options: CircuitBreakerOptions,
    private name: string = "default",
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // 1. Verificar estado del circuito
    if (this.state === "OPEN") {
      const timeSinceFailure = Date.now() - (this.lastFailureTime || 0);
      if (timeSinceFailure >= this.options.resetTimeout) {
        this.state = "HALF_OPEN";
        this.halfOpenSuccessCount = 0;
      } else {
        throw new Error(
          `CircuitBreaker "${this.name}" is OPEN. Service unavailable.`,
        );
      }
    }

    // 2. Ejecutar operación
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.halfOpenSuccessCount++;
      if (
        this.halfOpenSuccessCount >=
        (this.options.halfOpenSuccessThreshold || 1)
      ) {
        this.state = "CLOSED";
        logger.info(`✅ CircuitBreaker "${this.name}" CLOSED (recovered)`);
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.state = "OPEN"; // Vuelve a abrir si falla en half-open
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = "OPEN";
      logger.error(`🔴 CircuitBreaker "${this.name}" OPEN (too many failures)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  isAvailable(): boolean {
    if (this.state === "OPEN") {
      const timeSinceFailure = Date.now() - (this.lastFailureTime || 0);
      return timeSinceFailure >= this.options.resetTimeout;
    }
    return true;
  }
}
