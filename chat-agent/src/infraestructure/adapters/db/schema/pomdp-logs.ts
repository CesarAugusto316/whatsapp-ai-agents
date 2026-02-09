import {
  integer,
  pgTable,
  varchar,
  jsonb,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

export const pomdpLogsTable = pgTable("pomdp_logs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  // Identificadores de contexto
  businessId: varchar().notNull(),
  customerId: varchar(),
  sessionId: varchar().notNull(),
  chatKey: varchar().notNull(),

  // Información del turno de conversación
  conversationTurn: integer().notNull(),
  userMessage: varchar().notNull(),
  timestamp: timestamp().defaultNow().notNull(),

  // Resultados del RAG
  ragResults: jsonb(), // Array de {intent, module, score}

  // Estado de creencia ANTES de la actualización
  previousBeliefState: jsonb(), // Contiene intents, dominant, entropy, etc.

  // Observación construida
  observation: jsonb(), // Texto, resultados de intención, señales, contexto

  // Estado de creencia DESPUÉS de la actualización
  updatedBeliefState: jsonb(), // Contiene intents, dominant, entropy, etc.

  // Acción decidida por el Policy Engine
  actionType: varchar().notNull(), // "clarify", "confirm", "execute", "fallback", "continue"
  actionDetails: jsonb(), // Detalles específicos de la acción (pregunta, intent, saga, etc.)

  // Métricas de desempeño
  entropy: numeric(), // Nivel de incertidumbre
  confidence: numeric(), // Confianza en la intención dominante
  needsClarification: boolean(), // Si el sistema solicitó aclaración
  isStuck: boolean(), // Si el sistema se quedó atascado

  // Indicadores de calidad
  wasCorrectIntent: boolean(), // Si la intención detectada fue correcta (requiere validación manual/posterior)
  requiredHumanIntervention: boolean(), // Si terminó necesitando intervención humana

  // Metadata adicional
  metadata: jsonb(), // Cualquier otro dato relevante
});

// Índices para consultas eficientes
export const pomdpLogsIndexes = {
  businessIdIdx: "idx_pomdp_logs_business_id",
  customerIdIdx: "idx_pomdp_logs_customer_id",
  sessionIdIdx: "idx_pomdp_logs_session_id",
  timestampIdx: "idx_pomdp_logs_timestamp",
  actionTypeIdx: "idx_pomdp_logs_action_type",
};
