import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'business');
  CREATE TYPE "public"."enum_appointments_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');
  CREATE TYPE "public"."enum_businesses_currency" AS ENUM('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'MXN', 'COL', 'PEN');
  CREATE TYPE "public"."enum_businesses_general_business_type" AS ENUM('restaurant', 'medical', 'legal', 'real_estate');
  CREATE TYPE "public"."enum_businesses_general_timezone" AS ENUM('Europe/Madrid', 'Europe/Paris', 'Europe/London', 'America/Lima', 'America/New_York', 'Asia/Tokyo');
  CREATE TYPE "public"."enum_businesses_general_country" AS ENUM('ES', 'COL', 'MEX', 'PE', 'EC', 'US', 'CA');
  CREATE TYPE "public"."enum_products_type" AS ENUM('physical', 'digital');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'semanticSync');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'semanticSync');
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
  
  CREATE TABLE "third_party_access_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "third_party_access" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
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
  	"customer_name" varchar,
  	"timezone" varchar NOT NULL,
  	"start_date_time" timestamp(3) with time zone NOT NULL,
  	"end_date_time" timestamp(3) with time zone,
  	"status" "enum_appointments_status" DEFAULT 'pending' NOT NULL,
  	"number_of_people" numeric DEFAULT 1,
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
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_monday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"open" numeric NOT NULL,
  	"close" numeric NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_tuesday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"open" numeric NOT NULL,
  	"close" numeric NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_wednesday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"open" numeric NOT NULL,
  	"close" numeric NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_thursday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"open" numeric NOT NULL,
  	"close" numeric NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_friday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"open" numeric NOT NULL,
  	"close" numeric NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_saturday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"open" numeric NOT NULL,
  	"close" numeric NOT NULL
  );
  
  CREATE TABLE "businesses_schedule_sunday" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"open" numeric NOT NULL,
  	"close" numeric NOT NULL
  );
  
  CREATE TABLE "businesses_faq_for_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "businesses_questions_for_review_to_review" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"customer_realquestion" varchar,
  	"agent_answer" varchar,
  	"correct_answer" varchar,
  	"approved" boolean DEFAULT false
  );
  
  CREATE TABLE "businesses" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"assistant_name" varchar NOT NULL,
  	"currency" "enum_businesses_currency",
  	"taxes" numeric,
  	"general_phone_number" varchar DEFAULT '+34',
  	"general_require_appointment_approval" boolean DEFAULT true,
  	"general_business_type" "enum_businesses_general_business_type" DEFAULT 'restaurant' NOT NULL,
  	"general_max_capacity" numeric DEFAULT 10,
  	"general_description" varchar,
  	"general_user_id" uuid NOT NULL,
  	"general_timezone" "enum_businesses_general_timezone" DEFAULT 'Europe/Madrid' NOT NULL,
  	"general_is_active" boolean DEFAULT true,
  	"general_country" "enum_businesses_general_country",
  	"general_address" varchar,
  	"general_embed_map" varchar,
  	"general_location" geometry(Point),
  	"schedule_average_time" numeric DEFAULT 60 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "businesses_media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar NOT NULL,
  	"business_id" uuid NOT NULL,
  	"prefix" varchar DEFAULT 'business-media',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "products" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"price" numeric NOT NULL,
  	"type" "enum_products_type" NOT NULL,
  	"inventory" numeric,
  	"enabled" boolean DEFAULT true NOT NULL,
  	"description" varchar NOT NULL,
  	"business_id" uuid NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar NOT NULL,
  	"product_id" uuid NOT NULL,
  	"business_id" uuid NOT NULL,
  	"prefix" varchar DEFAULT 'business-products',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "product_orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"description" varchar NOT NULL,
  	"business_id" uuid NOT NULL,
  	"customer_id" uuid NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "product_carts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"quantity" numeric,
  	"product_id" uuid NOT NULL,
  	"order_id" uuid NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
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
  	"third_party_access_id" uuid,
  	"appointments_id" uuid,
  	"customers_id" uuid,
  	"businesses_id" uuid,
  	"businesses_media_id" uuid,
  	"products_id" uuid,
  	"products_media_id" uuid,
  	"product_orders_id" uuid,
  	"product_carts_id" uuid
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
  	"users_id" uuid,
  	"third_party_access_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "third_party_access_sessions" ADD CONSTRAINT "third_party_access_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."third_party_access"("id") ON DELETE cascade ON UPDATE no action;
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
  ALTER TABLE "businesses_faq_for_faq" ADD CONSTRAINT "businesses_faq_for_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses_questions_for_review_to_review" ADD CONSTRAINT "businesses_questions_for_review_to_review_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "businesses" ADD CONSTRAINT "businesses_general_user_id_users_id_fk" FOREIGN KEY ("general_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "businesses_media" ADD CONSTRAINT "businesses_media_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_media" ADD CONSTRAINT "products_media_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_media" ADD CONSTRAINT "products_media_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_carts" ADD CONSTRAINT "product_carts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_carts" ADD CONSTRAINT "product_carts_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."product_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_third_party_access_fk" FOREIGN KEY ("third_party_access_id") REFERENCES "public"."third_party_access"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_appointments_fk" FOREIGN KEY ("appointments_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_businesses_fk" FOREIGN KEY ("businesses_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_businesses_media_fk" FOREIGN KEY ("businesses_media_id") REFERENCES "public"."businesses_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_media_fk" FOREIGN KEY ("products_media_id") REFERENCES "public"."products_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_orders_fk" FOREIGN KEY ("product_orders_id") REFERENCES "public"."product_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_carts_fk" FOREIGN KEY ("product_carts_id") REFERENCES "public"."product_carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_third_party_access_fk" FOREIGN KEY ("third_party_access_id") REFERENCES "public"."third_party_access"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_phone_number_idx" ON "users" USING btree ("phone_number");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "third_party_access_sessions_order_idx" ON "third_party_access_sessions" USING btree ("_order");
  CREATE INDEX "third_party_access_sessions_parent_id_idx" ON "third_party_access_sessions" USING btree ("_parent_id");
  CREATE INDEX "third_party_access_updated_at_idx" ON "third_party_access" USING btree ("updated_at");
  CREATE INDEX "third_party_access_created_at_idx" ON "third_party_access" USING btree ("created_at");
  CREATE UNIQUE INDEX "third_party_access_email_idx" ON "third_party_access" USING btree ("email");
  CREATE INDEX "appointments_business_idx" ON "appointments" USING btree ("business_id");
  CREATE INDEX "appointments_customer_idx" ON "appointments" USING btree ("customer_id");
  CREATE INDEX "appointments_start_date_time_idx" ON "appointments" USING btree ("start_date_time");
  CREATE INDEX "appointments_end_date_time_idx" ON "appointments" USING btree ("end_date_time");
  CREATE INDEX "appointments_updated_at_idx" ON "appointments" USING btree ("updated_at");
  CREATE INDEX "appointments_created_at_idx" ON "appointments" USING btree ("created_at");
  CREATE INDEX "customers_phone_number_idx" ON "customers" USING btree ("phone_number");
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
  CREATE INDEX "businesses_faq_for_faq_order_idx" ON "businesses_faq_for_faq" USING btree ("_order");
  CREATE INDEX "businesses_faq_for_faq_parent_id_idx" ON "businesses_faq_for_faq" USING btree ("_parent_id");
  CREATE INDEX "businesses_questions_for_review_to_review_order_idx" ON "businesses_questions_for_review_to_review" USING btree ("_order");
  CREATE INDEX "businesses_questions_for_review_to_review_parent_id_idx" ON "businesses_questions_for_review_to_review" USING btree ("_parent_id");
  CREATE INDEX "businesses_general_general_user_idx" ON "businesses" USING btree ("general_user_id");
  CREATE INDEX "businesses_updated_at_idx" ON "businesses" USING btree ("updated_at");
  CREATE INDEX "businesses_created_at_idx" ON "businesses" USING btree ("created_at");
  CREATE INDEX "businesses_media_business_idx" ON "businesses_media" USING btree ("business_id");
  CREATE INDEX "businesses_media_updated_at_idx" ON "businesses_media" USING btree ("updated_at");
  CREATE INDEX "businesses_media_created_at_idx" ON "businesses_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "businesses_media_filename_idx" ON "businesses_media" USING btree ("filename");
  CREATE INDEX "products_business_idx" ON "products" USING btree ("business_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_media_product_idx" ON "products_media" USING btree ("product_id");
  CREATE INDEX "products_media_business_idx" ON "products_media" USING btree ("business_id");
  CREATE INDEX "products_media_updated_at_idx" ON "products_media" USING btree ("updated_at");
  CREATE INDEX "products_media_created_at_idx" ON "products_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "products_media_filename_idx" ON "products_media" USING btree ("filename");
  CREATE INDEX "product_orders_business_idx" ON "product_orders" USING btree ("business_id");
  CREATE INDEX "product_orders_customer_idx" ON "product_orders" USING btree ("customer_id");
  CREATE INDEX "product_orders_updated_at_idx" ON "product_orders" USING btree ("updated_at");
  CREATE INDEX "product_orders_created_at_idx" ON "product_orders" USING btree ("created_at");
  CREATE INDEX "product_carts_product_idx" ON "product_carts" USING btree ("product_id");
  CREATE INDEX "product_carts_order_idx" ON "product_carts" USING btree ("order_id");
  CREATE INDEX "product_carts_updated_at_idx" ON "product_carts" USING btree ("updated_at");
  CREATE INDEX "product_carts_created_at_idx" ON "product_carts" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_third_party_access_id_idx" ON "payload_locked_documents_rels" USING btree ("third_party_access_id");
  CREATE INDEX "payload_locked_documents_rels_appointments_id_idx" ON "payload_locked_documents_rels" USING btree ("appointments_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_businesses_id_idx" ON "payload_locked_documents_rels" USING btree ("businesses_id");
  CREATE INDEX "payload_locked_documents_rels_businesses_media_id_idx" ON "payload_locked_documents_rels" USING btree ("businesses_media_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_products_media_id_idx" ON "payload_locked_documents_rels" USING btree ("products_media_id");
  CREATE INDEX "payload_locked_documents_rels_product_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("product_orders_id");
  CREATE INDEX "payload_locked_documents_rels_product_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("product_carts_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_third_party_access_id_idx" ON "payload_preferences_rels" USING btree ("third_party_access_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "third_party_access_sessions" CASCADE;
  DROP TABLE "third_party_access" CASCADE;
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
  DROP TABLE "businesses_faq_for_faq" CASCADE;
  DROP TABLE "businesses_questions_for_review_to_review" CASCADE;
  DROP TABLE "businesses" CASCADE;
  DROP TABLE "businesses_media" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_media" CASCADE;
  DROP TABLE "product_orders" CASCADE;
  DROP TABLE "product_carts" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_appointments_status";
  DROP TYPE "public"."enum_businesses_currency";
  DROP TYPE "public"."enum_businesses_general_business_type";
  DROP TYPE "public"."enum_businesses_general_timezone";
  DROP TYPE "public"."enum_businesses_general_country";
  DROP TYPE "public"."enum_products_type";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
