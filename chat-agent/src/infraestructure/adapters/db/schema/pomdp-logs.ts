import {
  integer,
  pgTable,
  varchar,
  jsonb,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

// ============================================
// 1. Perfil de usuario (base para ML)
// ============================================
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
  // Metadata para personalización futura
  preferences: jsonb("preferences").default({}),
});

// ============================================
// 2. Logs de intenciones (base para ML/RL)
// ============================================
export const userIntents = pgTable("user_intents", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .references(() => users.id)
    .notNull(),
  // Intent detectado
  intentKey: varchar("intent_key", { length: 255 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  requiresConfirmation: varchar("requires_confirmation", {
    length: 20,
  }).notNull(),
  // Score y confianza
  score: numeric("score", { precision: 4, scale: 3 }).notNull(),
  isConfident: boolean("is_confident").notNull(),
  // Señales (si aplica)
  signalType: varchar("signal_type", { length: 50 }), // affirmation, negation, uncertainty
  // Contexto para ML
  metadata: jsonb("metadata").default({}),
  // Timestamp
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============================================
// 3. Pedidos del usuario (para restaurant)
// ============================================
export const userOrders = pgTable("user_orders", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .references(() => users.id)
    .notNull(),
  // Pedido
  orderItems: jsonb("order_items").notNull(), // [{ productId, quantity, name, price }]
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  // Estado
  status: varchar("status", { length: 50 }).notNull(), // pending, confirmed, delivered, cancelled
  // Metadata
  metadata: jsonb("metadata").default({}),
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ============================================
// 4. Reservas del usuario (para restaurant/booking)
// ============================================
export const userBookings = pgTable("user_bookings", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .references(() => users.id)
    .notNull(),
  // Reserva
  bookingType: varchar("booking_type", { length: 100 }).notNull(), // restaurant, real_estate, etc.
  bookingData: jsonb("booking_data").notNull(), // { date, time, guests, table, etc. }
  // Estado
  status: varchar("status", { length: 50 }).notNull(), // pending, confirmed, cancelled, completed
  // Metadata
  metadata: jsonb("metadata").default({}),
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});
