import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "appointments" ALTER COLUMN "day" SET DEFAULT '2025-12-17T15:16:02.336Z';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "start_date" SET DEFAULT '2025-12-17T15:16:02.335Z';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "end_date" SET DEFAULT '2025-12-17T15:16:02.336Z';
  CREATE INDEX "appointments_day_idx" ON "appointments" USING btree ("day");
  CREATE INDEX "appointments_start_date_time_idx" ON "appointments" USING btree ("start_date_time");
  CREATE INDEX "appointments_end_date_time_idx" ON "appointments" USING btree ("end_date_time");
  CREATE INDEX "customers_phone_number_idx" ON "customers" USING btree ("phone_number");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "appointments_day_idx";
  DROP INDEX "appointments_start_date_time_idx";
  DROP INDEX "appointments_end_date_time_idx";
  DROP INDEX "customers_phone_number_idx";
  ALTER TABLE "appointments" ALTER COLUMN "day" SET DEFAULT '2025-12-13T00:17:03.928Z';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "start_date" SET DEFAULT '2025-12-13T00:17:03.928Z';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "end_date" SET DEFAULT '2025-12-13T00:17:03.928Z';`)
}
