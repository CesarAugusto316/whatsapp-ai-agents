import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "appointments" ALTER COLUMN "day" SET DEFAULT '2025-12-26T18:48:39.564Z';
  ALTER TABLE "appointments" ALTER COLUMN "end_date_time" DROP NOT NULL;
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "start_date" SET DEFAULT '2025-12-26T18:48:39.563Z';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "end_date" SET DEFAULT '2025-12-26T18:48:39.563Z';
  ALTER TABLE "appointments" ADD COLUMN "customer_name" varchar;
  ALTER TABLE "appointments" ADD COLUMN "number_of_people" numeric DEFAULT 1;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "appointments" ALTER COLUMN "day" SET DEFAULT '2025-12-17T15:16:02.336Z';
  ALTER TABLE "appointments" ALTER COLUMN "end_date_time" SET NOT NULL;
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "start_date" SET DEFAULT '2025-12-17T15:16:02.335Z';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "end_date" SET DEFAULT '2025-12-17T15:16:02.336Z';
  ALTER TABLE "appointments" DROP COLUMN "customer_name";
  ALTER TABLE "appointments" DROP COLUMN "number_of_people";`)
}
