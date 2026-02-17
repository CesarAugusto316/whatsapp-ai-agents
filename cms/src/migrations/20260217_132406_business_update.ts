import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DATA TYPE text;
  ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DEFAULT 'restaurant'::text;
  DROP TYPE "public"."enum_businesses_general_business_type";
  CREATE TYPE "public"."enum_businesses_general_business_type" AS ENUM('restaurant', 'medical', 'legal', 'real-estate', 'erotic');
  ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DEFAULT 'restaurant'::"public"."enum_businesses_general_business_type";
  ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DATA TYPE "public"."enum_businesses_general_business_type" USING "general_business_type"::"public"."enum_businesses_general_business_type";`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DATA TYPE text;
  ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DEFAULT 'restaurant'::text;
  DROP TYPE "public"."enum_businesses_general_business_type";
  CREATE TYPE "public"."enum_businesses_general_business_type" AS ENUM('restaurant', 'medical', 'legal', 'real_estate', 'erotic');
  ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DEFAULT 'restaurant'::"public"."enum_businesses_general_business_type";
  ALTER TABLE "businesses" ALTER COLUMN "general_business_type" SET DATA TYPE "public"."enum_businesses_general_business_type" USING "general_business_type"::"public"."enum_businesses_general_business_type";`);
}
