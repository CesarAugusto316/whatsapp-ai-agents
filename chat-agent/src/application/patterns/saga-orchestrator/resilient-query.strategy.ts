import { RetryConfig, retryQuery } from "./retry-query.strategy";
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

/**
 * Opciones para configurar el comportamiento de resilientCall
 * @interface ResilientCallOptions
 *
 * @property {"llm" | "api" | "database"} [builtIn] - Configuración predefinida:
 *   - 'llm': Para modelos de lenguaje (ChatGPT, Gemini, etc.)
 *     - Timeout: 30 segundos
 *     - Reintentos: 2 intentos
 *     - Cortacircuito: 3 fallos para abrir
 *   - 'api': Para APIs externas (REST APIs, servicios web)
 *     - Timeout: 45 segundos
 *     - Reintentos: 3 intentos
 *     - Cortacircuito: 5 fallos para abrir
 *
 * @property {CircuitBreaker} [circuitBraker] - Instancia personalizada de CircuitBreaker.
 *   Si se proporciona, ignora la configuración builtIn.
 *
 * @property {number} [timeoutMs] - Tiempo máximo en milisegundos para que la operación complete.
 *   Por defecto: 30 segundos para 'llm', 45 segundos para 'api'.
 *
 * @property {Object} [retryConfig] - Configuración personalizada para reintentos
 * @property {number} [retryConfig.maxAttempts] - Número máximo de intentos (incluyendo el primero)
 * @property {number} [retryConfig.intervalSeconds] - Segundos entre intentos
 * @property {number} [retryConfig.backoffRate] - Factor de crecimiento del intervalo entre intentos
 *
 * @example
 * // Usar configuración predefinida para LLMs
 * const options = { builtIn: 'llm' }
 *
 * @example
 * // Personalizar timeout y reintentos
 * const options = {
 *   builtIn: 'api',
 *   timeoutMs: 60000,
 *   retryConfig: {
 *     maxAttempts: 5,
 *     intervalSeconds: 2
 *   }
 * }
 *
 * @example
 * // Usar un CircuitBreaker personalizado
 * const myBreaker = new CircuitBreaker({failureThreshold: 3, resetTimeout: 10000}, 'mi-servicio')
 * const options = { circuitBraker: myBreaker }
 */
export interface ResilientQueryOptions {
  builtIn?: "llm" | "api" | "database";
  circuitBraker?: CircuitBreaker;
  timeoutMs?: number;
  retryConfig?: RetryConfig;
}

/**
 * Ejecuta una operación asíncrona con resiliencia incorporada.
 *
 * Esta función combina tres patrones de resiliencia:
 * 1. **Circuit Breaker**: Previene sobrecargar servicios fallidos
 * 2. **Retry**: Reintenta operaciones fallidas automáticamente
 * 3. **Timeout**: Limita el tiempo máximo de ejecución
 *
 * Además, incluye lógica inteligente de reintentos:
 * - Reintenta errores del servidor (5xx)
 * - Reintenta rate limits (429)
 * - NO reintenta errores del cliente (4xx excepto 429)
 *
 * @template T Tipo de retorno de la operación
 *
 * @param {() => Promise<T>} operation - Función asíncrona a ejecutar.
 *   Debe devolver una Promise que resuelva al resultado deseado.
 * @param {ResilientQueryOptions} [options={}] - Opciones de configuración.
 *
 * @returns {Promise<T>} El resultado de la operación si tiene éxito.
 *
 * @throws {Error} Si la operación falla después de todos los reintentos,
 *   si se excede el timeout, o si el circuito está abierto.
 *
 * @example <caption>Uso básico con LLM (ChatGPT, Gemini, etc.)</caption>
 * const respuesta = await resilientCall(
 *   async () => {
 *     // Llamada a tu modelo de lenguaje
 *     return await chatGPT.generate("Hola mundo");
 *   },
 *   { builtIn: 'llm' }
 * );
 * console.log(respuesta); // "¡Hola! ¿Cómo estás?"
 *
 * @example <caption>Llamada a API REST externa</caption>
 * const datosUsuario = await resilientCall(
 *   async () => {
 *     const response = await fetch('https://api.ejemplo.com/users/123');
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return await response.json();
 *   },
 *   { builtIn: 'api' }
 * );
 * console.log(datosUsuario); // { id: 123, name: "Juan" }
 *
 * @example <caption>Con timeout personalizado</caption>
 * // Para operaciones que sabes que pueden tardar más
 * const resultado = await resilientCall(
 *   async () => await procesarArchivoGrande('datos.csv'),
 *   {
 *     builtIn: 'api',
 *     timeoutMs: 120000 // 2 minutos
 *   }
 * );
 *
 * @example <caption>Con reintentos personalizados</caption>
 * // Para servicios inestables que necesitan más intentos
 * const pago = await resilientCall(
 *   async () => await procesarPagoConStripe(datosPago),
 *   {
 *     builtIn: 'api',
 *     retryConfig: {
 *       maxAttempts: 5,           // 5 intentos en total
 *       intervalSeconds: 3,       // 3 segundos entre intentos
 *       backoffRate: 2            // Duplica el tiempo cada intento
 *     }
 *   }
 * );
 *
 * @example <caption>Operación con base de datos</caption>
 * const usuario = await resilientCall(
 *   async () => {
 *     return await prisma.user.findUnique({
 *       where: { email: 'usuario@ejemplo.com' }
 *     });
 *   },
 *   { builtIn: 'api' } // Usar 'api' para bases de datos
 * );
 *
 * @example <caption>Manejo de errores</caption>
 * try {
 *   const resultado = await resilientCall(
 *     async () => await servicioExterno(),
 *     { builtIn: 'api' }
 *   );
 * } catch (error) {
 *   if (error.message.includes('CircuitBreaker')) {
 *     console.error('Servicio temporalmente no disponible');
 *     // Mostrar mensaje amigable al usuario
 *   } else if (error.message.includes('Timeout')) {
 *     console.error('La operación tardó demasiado');
 *     // Sugerir reintentar más tarde
 *   } else {
 *     console.error('Error inesperado:', error);
 *     // Manejo general de errores
 *   }
 * }
 *
 * @example <caption>Uso con múltiples operaciones</caption>
 * // Ejecutar varias operaciones resilientes en paralelo
 * const [datosUsuario, datosProducto, historial] = await Promise.all([
 *   resilientCall(() => obtenerUsuario(id), { builtIn: 'api' }),
 *   resilientCall(() => obtenerProducto(sku), { builtIn: 'api' }),
 *   resilientCall(() => obtenerHistorial(userId), { builtIn: 'api' })
 * ]);
 *
 * @example <caption>Evitar uso incorrecto</caption>
 * // ❌ NO USAR para operaciones que no deben repetirse
 * // (como crear facturas o hacer transferencias)
 *
 * // ✅ En su lugar, usar try/catch directo:
 * try {
 *   const factura = await crearFactura(datos);
 * } catch (error) {
 *   // Manejo específico sin reintentos automáticos
 * }
 *
 * @see {@link ResilientQueryOptions} para más detalles sobre las opciones
 * @see CircuitBreaker para entender el patrón cortacircuitos
 * @see retryQuery para entender la lógica de reintentos
 */
export async function resilientQuery<T>(
  operation: () => Promise<T>,
  options: ResilientQueryOptions = {},
): Promise<T> {
  // Determinar timeout basado en configuración
  const timeoutMs =
    options.timeoutMs ?? (options.builtIn === "llm" ? 30000 : 45000);

  // Seleccionar CircuitBreaker apropiado
  const circuitBreaker = options.circuitBraker
    ? options.circuitBraker
    : options.builtIn === "llm"
      ? llmCircuitBreaker
      : apiCircuitBreaker;

  // Configurar estrategia de reintentos
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

  // Ejecutar con la jerarquía: CircuitBreaker → Retry → Timeout → Operación
  return circuitBreaker.execute<T>(async () => {
    return retryQuery(async () => {
      return await Promise.race([
        operation(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);
    }, retryConfig);
  });
}
