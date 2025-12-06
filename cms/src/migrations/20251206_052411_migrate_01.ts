import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'business');
  CREATE TYPE "public"."enum_appointments_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');
  CREATE TYPE "public"."enum_businesses_general_business_type" AS ENUM('restaurant', 'medical', 'legal', 'real_estate');
  CREATE TYPE "public"."enum_businesses_general_timezone" AS ENUM('Europe/Madrid', 'Europe/Paris', 'Europe/London', 'America/Lima', 'America/New_York', 'Asia/Tokyo');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"role" "enum_users_role" DEFAULT 'business' NOT NULL,
  	"name" varchar DEFAULT '' NOT NULL,
  	"phone_number" varchar DEFAULT '+34',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "appointments" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"business_id" uuid NOT NULL,
  	"customer_id" uuid NOT NULL,
  	"start_date_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_date_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL,
  	"status" "enum_appointments_status" DEFAULT 'pending' NOT NULL,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"phone_number" varchar DEFAULT '+34' NOT NULL,
  	"business_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"block" boolean DEFAULT false,
  	"email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "businesses_general_next_holiday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_date" timestamp(3) with time zone DEFAULT '2025-12-06T05:24:11.625Z' NOT NULL,
  	"end_date" timestamp(3) with time zone DEFAULT '2025-12-06T05:24:11.626Z' NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_monday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_tuesday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_wednesday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_thursday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_friday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_saturday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_sunday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL,
  	"end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL
  );
  
  CREATE TABLE "businesses" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"general_phone_number" varchar DEFAULT '+34' NOT NULL,
  	"general_require_appointment_approval" boolean DEFAULT true,
  	"general_business_type" "enum_businesses_general_business_type" DEFAULT 'restaurant' NOT NULL,
  	"general_tables" numeric DEFAULT 1,
  	"general_description" varchar,
  	"general_user_id" uuid NOT NULL,
  	"general_timezone" "enum_businesses_general_timezone" DEFAULT 'Europe/Madrid' NOT NULL,
  	"general_is_active" boolean DEFAULT true,
  	"schedule_average_time" numeric DEFAULT 1 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"appointments_id" uuid,
  	"customers_id" uuid,
  	"businesses_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "businesses_general_next_holiday" ADD CONSTRAINT "businesses_general_next_holiday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_schedule_monday" ADD CONSTRAINT "businesses_schedule_monday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_schedule_tuesday" ADD CONSTRAINT "businesses_schedule_tuesday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_schedule_wednesday" ADD CONSTRAINT "businesses_schedule_wednesday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_schedule_thursday" ADD CONSTRAINT "businesses_schedule_thursday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_schedule_friday" ADD CONSTRAINT "businesses_schedule_friday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_schedule_saturday" ADD CONSTRAINT "businesses_schedule_saturday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_schedule_sunday" ADD CONSTRAINT "businesses_schedule_sunday_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses" ADD CONSTRAINT "businesses_general_user_id_users_id_fk" FOREIGN KEY ("general_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_appointments_fk" FOREIGN KEY ("appointments_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_businesses_fk" FOREIGN KEY ("businesses_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_phone_number_idx" ON "users" USING btree ("phone_number");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "appointments_business_idx" ON "appointments" USING btree ("business_id");
  CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id");
  CREATE INDEX "appointments_updated_at_idx" ON "appointments" USING btree ("updated_at");
  CREATE INDEX "appointments_created_at_idx" ON "appointments" USING btree ("created_at");
  CREATE INDEX "customers_business_idx" ON "customers" USING btree ("business_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE INDEX "businesses_general_next_holiday_order_idx" ON "businesses_general_next_holiday" USING btree ("_order");
  CREATE INDEX "businesses_general_next_holiday_parent_id_idx" ON "businesses_general_next_holiday" USING btree ("_parent_id");
  CREATE INDEX "businesses_schedule_monday_order_idx" ON "businesses_schedule_monday" USING btree ("_order");
  CREATE INDEX "businesses_schedule_monday_parent_id_idx" ON "businesses_schedule_monday" USING btree ("_parent_id");
  CREATE INDEX "businesses_schedule_tuesday_order_idx" ON "businesses_schedule_tuesday" USING btree ("_order");
  CREATE INDEX "businesses_schedule_tuesday_parent_id_idx" ON "businesses_schedule_tuesday" USING btree ("_parent_id");
  CREATE INDEX "businesses_schedule_wednesday_order_idx" ON "businesses_schedule_wednesday" USING btree ("_order");
  CREATE INDEX "businesses_schedule_wednesday_parent_id_idx" ON "businesses_schedule_wednesday" USING btree ("_parent_id");
  CREATE INDEX "businesses_schedule_thursday_order_idx" ON "businesses_schedule_thursday" USING btree ("_order");
  CREATE INDEX "businesses_schedule_thursday_parent_id_idx" ON "businesses_schedule_thursday" USING btree ("_parent_id");
  CREATE INDEX "businesses_schedule_friday_order_idx" ON "businesses_schedule_friday" USING btree ("_order");
  CREATE INDEX "businesses_schedule_friday_parent_id_idx" ON "businesses_schedule_friday" USING btree ("_parent_id");
  CREATE INDEX "businesses_schedule_saturday_order_idx" ON "businesses_schedule_saturday" USING btree ("_order");
  CREATE INDEX "businesses_schedule_saturday_parent_id_idx" ON "businesses_schedule_saturday" USING btree ("_parent_id");
  CREATE INDEX "businesses_schedule_sunday_order_idx" ON "businesses_schedule_sunday" USING btree ("_order");
  CREATE INDEX "businesses_schedule_sunday_parent_id_idx" ON "businesses_schedule_sunday" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "businesses_general_general_phone_number_idx" ON "businesses" USING btree ("general_phone_number");
  CREATE INDEX "businesses_general_general_user_idx" ON "businesses" USING btree ("general_user_id");
  CREATE INDEX "businesses_updated_at_idx" ON "businesses" USING btree ("updated_at");
  CREATE INDEX "businesses_created_at_idx" ON "businesses" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_appointments_id_idx" ON "payload_locked_documents_rels" USING btree ("appointments_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_businesses_id_idx" ON "payload_locked_documents_rels" USING btree ("businesses_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "appointments" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "businesses_general_next_holiday" CASCADE;
  DROP TABLE "businesses_schedule_monday" CASCADE;
  DROP TABLE "businesses_schedule_tuesday" CASCADE;
  DROP TABLE "businesses_schedule_wednesday" CASCADE;
  DROP TABLE "businesses_schedule_thursday" CASCADE;
  DROP TABLE "businesses_schedule_friday" CASCADE;
  DROP TABLE "businesses_schedule_saturday" CASCADE;
  DROP TABLE "businesses_schedule_sunday" CASCADE;
  DROP TABLE "businesses" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_appointments_status";
  DROP TYPE "public"."enum_businesses_general_business_type";
  DROP TYPE "public"."enum_businesses_general_timezone";`)
}
