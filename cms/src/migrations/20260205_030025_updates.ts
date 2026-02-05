import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "product_order" RENAME TO "product_orders";
  ALTER TABLE "product_cart" RENAME TO "product_carts";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "product_order_id" TO "product_orders_id";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "product_cart_id" TO "product_carts_id";
  ALTER TABLE "product_orders" DROP CONSTRAINT "product_order_business_id_businesses_id_fk";
  
  ALTER TABLE "product_orders" DROP CONSTRAINT "product_order_customer_id_customers_id_fk";
  
  ALTER TABLE "product_carts" DROP CONSTRAINT "product_cart_product_id_products_id_fk";
  
  ALTER TABLE "product_carts" DROP CONSTRAINT "product_cart_order_id_product_order_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_product_order_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_product_cart_fk";
  
  DROP INDEX "product_order_business_idx";
  DROP INDEX "product_order_customer_idx";
  DROP INDEX "product_order_updated_at_idx";
  DROP INDEX "product_order_created_at_idx";
  DROP INDEX "product_cart_product_idx";
  DROP INDEX "product_cart_order_idx";
  DROP INDEX "product_cart_updated_at_idx";
  DROP INDEX "product_cart_created_at_idx";
  DROP INDEX "payload_locked_documents_rels_product_order_id_idx";
  DROP INDEX "payload_locked_documents_rels_product_cart_id_idx";
  ALTER TABLE "businesses" ADD COLUMN "address" varchar;
  ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_orders" ADD CONSTRAINT "product_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_carts" ADD CONSTRAINT "product_carts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_carts" ADD CONSTRAINT "product_carts_order_id_product_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."product_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_orders_fk" FOREIGN KEY ("product_orders_id") REFERENCES "public"."product_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_carts_fk" FOREIGN KEY ("product_carts_id") REFERENCES "public"."product_carts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "product_orders_business_idx" ON "product_orders" USING btree ("business_id");
  CREATE INDEX "product_orders_customer_idx" ON "product_orders" USING btree ("customer_id");
  CREATE INDEX "product_orders_updated_at_idx" ON "product_orders" USING btree ("updated_at");
  CREATE INDEX "product_orders_created_at_idx" ON "product_orders" USING btree ("created_at");
  CREATE INDEX "product_carts_product_idx" ON "product_carts" USING btree ("product_id");
  CREATE INDEX "product_carts_order_idx" ON "product_carts" USING btree ("order_id");
  CREATE INDEX "product_carts_updated_at_idx" ON "product_carts" USING btree ("updated_at");
  CREATE INDEX "product_carts_created_at_idx" ON "product_carts" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_product_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("product_orders_id");
  CREATE INDEX "payload_locked_documents_rels_product_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("product_carts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "product_orders" RENAME TO "product_order";
  ALTER TABLE "product_carts" RENAME TO "product_cart";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "product_orders_id" TO "product_order_id";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "product_carts_id" TO "product_cart_id";
  ALTER TABLE "product_order" DROP CONSTRAINT "product_orders_business_id_businesses_id_fk";
  
  ALTER TABLE "product_order" DROP CONSTRAINT "product_orders_customer_id_customers_id_fk";
  
  ALTER TABLE "product_cart" DROP CONSTRAINT "product_carts_product_id_products_id_fk";
  
  ALTER TABLE "product_cart" DROP CONSTRAINT "product_carts_order_id_product_orders_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_product_orders_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_product_carts_fk";
  
  DROP INDEX "product_orders_business_idx";
  DROP INDEX "product_orders_customer_idx";
  DROP INDEX "product_orders_updated_at_idx";
  DROP INDEX "product_orders_created_at_idx";
  DROP INDEX "product_carts_product_idx";
  DROP INDEX "product_carts_order_idx";
  DROP INDEX "product_carts_updated_at_idx";
  DROP INDEX "product_carts_created_at_idx";
  DROP INDEX "payload_locked_documents_rels_product_orders_id_idx";
  DROP INDEX "payload_locked_documents_rels_product_carts_id_idx";
  ALTER TABLE "product_order" ADD CONSTRAINT "product_order_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_order" ADD CONSTRAINT "product_order_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_cart" ADD CONSTRAINT "product_cart_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_cart" ADD CONSTRAINT "product_cart_order_id_product_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."product_order"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_order_fk" FOREIGN KEY ("product_order_id") REFERENCES "public"."product_order"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_cart_fk" FOREIGN KEY ("product_cart_id") REFERENCES "public"."product_cart"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "product_order_business_idx" ON "product_order" USING btree ("business_id");
  CREATE INDEX "product_order_customer_idx" ON "product_order" USING btree ("customer_id");
  CREATE INDEX "product_order_updated_at_idx" ON "product_order" USING btree ("updated_at");
  CREATE INDEX "product_order_created_at_idx" ON "product_order" USING btree ("created_at");
  CREATE INDEX "product_cart_product_idx" ON "product_cart" USING btree ("product_id");
  CREATE INDEX "product_cart_order_idx" ON "product_cart" USING btree ("order_id");
  CREATE INDEX "product_cart_updated_at_idx" ON "product_cart" USING btree ("updated_at");
  CREATE INDEX "product_cart_created_at_idx" ON "product_cart" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_product_order_id_idx" ON "payload_locked_documents_rels" USING btree ("product_order_id");
  CREATE INDEX "payload_locked_documents_rels_product_cart_id_idx" ON "payload_locked_documents_rels" USING btree ("product_cart_id");
  ALTER TABLE "businesses" DROP COLUMN "address";`)
}
