import { MiddlewareHandler } from "hono";
import { CTX } from "@/types/hono.types";

export const unifiedLogger = (): MiddlewareHandler<CTX> => {
  return async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    // Ejecutamos todos los siguientes middlewares y handlers
    await next();

    const end = Date.now();
    const elapsed = end - start;
    const status = c.res.status;

    // Ahora tenemos acceso al contexto gracias a que contextMiddleware ya se ejecutó
    const businessId =
      c.get("businessId") || c.req.param("businessId") || "N/A";
    const customerPhone = c.get("customerPhone") || "N/A";
    const session = c.get("session") || "N/A";
    const customerMessage = c.get("customerMessage") || "N/A";
    const event = c.get("whatsappEvent") || "N/A";

    // Colores para consola
    const colorStatus = (status: number): string => {
      if (status >= 500) return `\x1b[31m${status}\x1b[0m`;
      if (status >= 400) return `\x1b[33m${status}\x1b[0m`;
      if (status >= 300) return `\x1b[36m${status}\x1b[0m`;
      if (status >= 200) return `\x1b[32m${status}\x1b[0m`;
      return `${status}`;
    };

    const formatTime = (ms: number): string => {
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    };

    // Log principal (estilo Hono)
    console.log(
      `\x1b[34m${method} ${path} ${colorStatus(status)} ${formatTime(elapsed)}\x1b[0m`,
    );

    // Log adicional para rutas específicas (solo si tenemos contexto)
    if (businessId && businessId !== "N/A") {
      console.log(
        `  📱 [Business: ${businessId}, Phone: ${customerPhone}, Session: ${session}]`,
      );

      if (customerMessage && customerMessage !== "N/A") {
        const truncatedMsg =
          customerMessage.length > 100
            ? customerMessage.substring(0, 100) + "..."
            : customerMessage;
        console.log(`  💬 ${event}: "${truncatedMsg}"`);
      }
    }

    // Log de errores (si hay error en el body de respuesta)
    if (status >= 400) {
      console.error(`  ❌ Error: ${c.res.statusText}`);
    }
  };
};

// middlewares/professionalLogger.middleware.ts
// import { MiddlewareHandler } from "hono";
// import { CTX } from "@/types/hono.types";

// Tipos para diferentes niveles de log
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";
type LogData = {
  timestamp: string;
  level: LogLevel;
  method: string;
  path: string;
  status: number;
  duration: number;
  durationHuman: string;
  businessId?: string;
  customerPhone?: string;
  session?: string;
  event?: string;
  messagePreview?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
  traceId?: string;
};

export const professionalLogger = (): MiddlewareHandler<CTX> => {
  return async (c, next) => {
    const start = performance.now(); // Más preciso que Date.now()
    const method = c.req.method;
    const path = c.req.path;
    const url = new URL(c.req.url);
    const queryParams = Object.fromEntries(url.searchParams);

    // Headers útiles para logging
    const userAgent = c.req.header("User-Agent") || "N/A";
    const xForwardedFor = c.req.header("x-forwarded-for");
    const realIp = c.req.header("x-real-ip");
    const ip = xForwardedFor || realIp || "N/A";

    // Intentamos obtener un trace ID si existe
    const traceId =
      c.req.header("x-trace-id") || crypto.randomUUID().split("-")[0];

    try {
      await next();
      const end = performance.now();
      const elapsed = end - start;

      const status = c.res.status;
      const level: LogLevel =
        status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";

      // Obtenemos datos del contexto
      const businessId = c.get("businessId");
      const customerPhone = c.get("customerPhone");
      const session = c.get("session");
      const customerMessage = c.get("customerMessage");
      const event = c.get("whatsappEvent");

      // Preparar el objeto de log
      const logData: LogData = {
        timestamp: new Date().toISOString(),
        level,
        method,
        path,
        status,
        duration: Math.round(elapsed * 100) / 100, // 2 decimales
        durationHuman:
          elapsed < 1000
            ? `${Math.round(elapsed)}ms`
            : `${(elapsed / 1000).toFixed(2)}s`,
        ip,
        userAgent:
          userAgent !== "N/A"
            ? userAgent.substring(0, 50) + (userAgent.length > 50 ? "..." : "")
            : undefined,
        traceId,
      };

      // Solo agregar datos específicos si existen
      if (businessId) logData.businessId = businessId;
      if (customerPhone && customerPhone !== "N/A")
        logData.customerPhone = customerPhone;
      if (session && session !== "N/A") logData.session = session;
      if (event && event !== "N/A") logData.event = event;
      if (customerMessage && customerMessage !== "N/A") {
        logData.messagePreview =
          customerMessage.length > 50
            ? customerMessage.substring(0, 50) + "..."
            : customerMessage;
      }

      // Query params (solo si existen y no son sensibles)
      if (Object.keys(queryParams).length > 0 && !path.includes("auth")) {
        // Podríamos agregar queryParams filtrados si es necesario
      }

      // Formatear el log según el entorno
      if (process.env.NODE_ENV === "production") {
        // En producción: JSON estructurado
        console.log(JSON.stringify(logData));
      } else {
        // En desarrollo: formato legible con colores
        formatDevLog(logData);
      }

      // Para errores 4xx/5xx, loggear el cuerpo del error si existe
      if (status >= 400) {
        try {
          const clonedRes = c.res.clone();
          const errorBody = await clonedRes.text();
          if (errorBody) {
            const errorLog = {
              timestamp: new Date().toISOString(),
              level: "ERROR",
              traceId,
              path,
              status,
              errorBody:
                errorBody.length > 200
                  ? errorBody.substring(0, 200) + "..."
                  : errorBody,
            };

            if (process.env.NODE_ENV === "production") {
              console.error(JSON.stringify(errorLog));
            } else {
              console.error(
                `\x1b[31m[ERROR_DETAIL] ${JSON.stringify(errorLog, null, 2)}\x1b[0m`,
              );
            }
          }
        } catch (e) {
          // Ignorar errores al leer el cuerpo
        }
      }
    } catch (error) {
      const end = performance.now();
      const elapsed = end - start;

      const errorLog: LogData = {
        timestamp: new Date().toISOString(),
        level: "ERROR",
        method,
        path,
        status: 500,
        duration: Math.round(elapsed * 100) / 100,
        durationHuman: `${Math.round(elapsed)}ms`,
        ip,
        traceId,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      if (process.env.NODE_ENV === "production") {
        console.error(JSON.stringify(errorLog));
      } else {
        console.error(
          `\x1b[31m[UNHANDLED_ERROR] ${JSON.stringify(errorLog, null, 2)}\x1b[0m`,
        );
      }

      throw error; // Re-lanzar para que el error handler de Hono lo maneje
    }
  };
};

// Alternativa con mejor separación visual
function formatDevLog(data: LogData) {
  const {
    level,
    method,
    path,
    status,
    durationHuman,
    businessId,
    customerPhone,
    messagePreview,
    traceId,
  } = data;

  // Colores según nivel
  const levelColor =
    {
      INFO: "\x1b[32m", // Verde
      WARN: "\x1b[33m", // Amarillo
      ERROR: "\x1b[31m", // Rojo
      DEBUG: "\x1b[36m", // Cyan
    }[level] || "\x1b[0m";

  // Color para status code
  const statusColor =
    status >= 500
      ? "\x1b[31m" // Rojo
      : status >= 400
        ? "\x1b[33m" // Amarillo
        : status >= 300
          ? "\x1b[36m" // Cyan
          : status >= 200
            ? "\x1b[32m" // Verde
            : "\x1b[0m";

  // Timestamp limpio
  const timestamp = new Date().toLocaleTimeString("es-ES", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Línea 1: Información básica de la request
  console.log(`\x1b[90m╭─\x1b[0m ${timestamp}`);

  // Línea 2: Método, ruta y respuesta
  const statusFormatted = statusColor + status + "\x1b[0m";
  const durationFormatted = "\x1b[90m(" + durationHuman + ")\x1b[0m";

  console.log(
    `\x1b[90m│\x1b[0m ${levelColor}${level}\x1b[0m ${method} ${path} ${statusFormatted} ${durationFormatted}`,
  );

  // Línea 3: Contexto específico
  const contextLines: string[] = [];

  if (businessId) {
    contextLines.push(
      `\x1b[90m│\x1b[0m \x1b[36mBusiness:\x1b[0m ${businessId}`,
    );
  }

  if (customerPhone && customerPhone !== "N/A") {
    contextLines.push(
      `\x1b[90m│\x1b[0m \x1b[36mCustomer:\x1b[0m ${customerPhone}`,
    );
  }

  if (messagePreview) {
    contextLines.push(
      `\x1b[90m│\x1b[0m \x1b[36mContent:\x1b[0m "${messagePreview}"`,
    );
  }

  if (traceId) {
    contextLines.push(`\x1b[90m│\x1b[0m \x1b[90mTrace ID:\x1b[0m ${traceId}`);
  }

  // Mostrar todas las líneas de contexto
  contextLines.forEach((line) => console.log(line));

  // Línea final
  console.log(`\x1b[90m╰─\x1b[0m`);
}
// Opcional: Exportar una función para logging manual desde handlers
export const createContextLogger = (c: CTX) => {
  const traceId =
    c.req.header("x-trace-id") || crypto.randomUUID().split("-")[0];

  return {
    info: (message: string, data?: any) => {
      const log = {
        timestamp: new Date().toISOString(),
        level: "INFO" as LogLevel,
        message,
        traceId,
        businessId: c.get("businessId"),
        customerPhone: c.get("customerPhone"),
        data,
      };

      if (process.env.NODE_ENV === "production") {
        console.log(JSON.stringify(log));
      } else {
        console.log(
          `\x1b[36m[DEBUG] ${message}\x1b[0m`,
          data ? JSON.stringify(data, null, 2) : "",
        );
      }
    },

    error: (message: string, error?: Error) => {
      const log = {
        timestamp: new Date().toISOString(),
        level: "ERROR" as LogLevel,
        message,
        traceId,
        businessId: c.get("businessId"),
        customerPhone: c.get("customerPhone"),
        error: error?.message,
        stack: error?.stack,
      };

      if (process.env.NODE_ENV === "production") {
        console.error(JSON.stringify(log));
      } else {
        console.error(
          `\x1b[31m[ERROR] ${message}\x1b[0m`,
          error ? error.message : "",
        );
      }
    },
  };
};
