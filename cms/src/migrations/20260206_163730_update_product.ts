import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_estimated_processing_time_unit" AS ENUM('minutes', 'hours', 'days');
  ALTER TABLE "products" ADD COLUMN "estimated_processing_time_min" numeric NOT NULL;
  ALTER TABLE "products" ADD COLUMN "estimated_processing_time_max" numeric NOT NULL;
  ALTER TABLE "products" ADD COLUMN "estimated_processing_time_unit" "enum_products_estimated_processing_time_unit" DEFAULT 'minutes';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "estimated_processing_time_min";
  ALTER TABLE "products" DROP COLUMN "estimated_processing_time_max";
  ALTER TABLE "products" DROP COLUMN "estimated_processing_time_unit";
  DROP TYPE "public"."enum_products_estimated_processing_time_unit";`)
}
