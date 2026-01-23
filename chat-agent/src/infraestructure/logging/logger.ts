import { env } from "bun";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

// Opcional: Exportar una función para logging manual desde handlers
export const logger = {
  info(message: string, data?: any) {
    const log = {
      timestamp: new Date().toISOString(),
      level: "INFO" as LogLevel,
      message,
      // traceId,
      // businessId: c.get("businessId"),
      // customerPhone: c.get("customerPhone"),
      data,
    };

    if (env.NODE_ENV === "production") {
      console.log(JSON.stringify(log));
    } else {
      console.log(
        `\x1b[36m[DEBUG] ${message}\x1b[0m`,
        data ? JSON.stringify(data, null, 2) : "",
      );
    }
  },

  error(message: string, error?: Error) {
    const log = {
      timestamp: new Date().toISOString(),
      level: "ERROR" as LogLevel,
      message,
      // traceId,
      // businessId: c.get("businessId"),
      // customerPhone: c.get("customerPhone"),
      error: error?.message,
      stack: error?.stack,
    };

    if (env.NODE_ENV === "production") {
      console.error(JSON.stringify(log));
    } else {
      console.error(
        `\x1b[31m[ERROR] ${message}\x1b[0m`,
        error ? error.message : "",
      );
    }
  },
};
