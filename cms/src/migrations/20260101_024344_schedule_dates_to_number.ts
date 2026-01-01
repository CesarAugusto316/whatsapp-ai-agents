import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "appointments_day_idx";
  ALTER TABLE "appointments" ALTER COLUMN "start_date_time" DROP DEFAULT;
  ALTER TABLE "appointments" ALTER COLUMN "end_date_time" DROP DEFAULT;
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "start_date" DROP DEFAULT;
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "end_date" DROP DEFAULT;
  ALTER TABLE "businesses" ALTER COLUMN "schedule_average_time" SET DEFAULT 60;
  ALTER TABLE "businesses_schedule_monday" ADD COLUMN "open" numeric;
  ALTER TABLE "businesses_schedule_monday" ADD COLUMN "close" numeric;
  ALTER TABLE "businesses_schedule_tuesday" ADD COLUMN "open" numeric;
  ALTER TABLE "businesses_schedule_tuesday" ADD COLUMN "close" numeric;
  ALTER TABLE "businesses_schedule_wednesday" ADD COLUMN "open" numeric;
  ALTER TABLE "businesses_schedule_wednesday" ADD COLUMN "close" numeric;
  ALTER TABLE "businesses_schedule_thursday" ADD COLUMN "open" numeric;
  ALTER TABLE "businesses_schedule_thursday" ADD COLUMN "close" numeric;
  ALTER TABLE "businesses_schedule_friday" ADD COLUMN "open" numeric;
  ALTER TABLE "businesses_schedule_friday" ADD COLUMN "close" numeric;
  ALTER TABLE "businesses_schedule_saturday" ADD COLUMN "open" numeric;
  ALTER TABLE "businesses_schedule_saturday" ADD COLUMN "close" numeric;
  ALTER TABLE "businesses_schedule_sunday" ADD COLUMN "open" numeric;
  ALTER TABLE "businesses_schedule_sunday" ADD COLUMN "close" numeric;
  ALTER TABLE "appointments" DROP COLUMN "day";
  ALTER TABLE "businesses_schedule_monday" DROP COLUMN "start_time";
  ALTER TABLE "businesses_schedule_monday" DROP COLUMN "end_time";
  ALTER TABLE "businesses_schedule_tuesday" DROP COLUMN "start_time";
  ALTER TABLE "businesses_schedule_tuesday" DROP COLUMN "end_time";
  ALTER TABLE "businesses_schedule_wednesday" DROP COLUMN "start_time";
  ALTER TABLE "businesses_schedule_wednesday" DROP COLUMN "end_time";
  ALTER TABLE "businesses_schedule_thursday" DROP COLUMN "start_time";
  ALTER TABLE "businesses_schedule_thursday" DROP COLUMN "end_time";
  ALTER TABLE "businesses_schedule_friday" DROP COLUMN "start_time";
  ALTER TABLE "businesses_schedule_friday" DROP COLUMN "end_time";
  ALTER TABLE "businesses_schedule_saturday" DROP COLUMN "start_time";
  ALTER TABLE "businesses_schedule_saturday" DROP COLUMN "end_time";
  ALTER TABLE "businesses_schedule_sunday" DROP COLUMN "start_time";
  ALTER TABLE "businesses_schedule_sunday" DROP COLUMN "end_time";`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "appointments" ALTER COLUMN "start_date_time" SET DEFAULT '2000-01-01T08:00:00.000';
  ALTER TABLE "appointments" ALTER COLUMN "end_date_time" SET DEFAULT '2000-01-01T17:00:00.000';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "start_date" SET DEFAULT '2025-12-26T18:48:39.563Z';
  ALTER TABLE "businesses_general_next_holiday" ALTER COLUMN "end_date" SET DEFAULT '2025-12-26T18:48:39.563Z';
  ALTER TABLE "businesses" ALTER COLUMN "schedule_average_time" SET DEFAULT 1;
  ALTER TABLE "appointments" ADD COLUMN "day" timestamp(3) with time zone DEFAULT '2025-12-26T18:48:39.564Z' NOT NULL;
  ALTER TABLE "businesses_schedule_monday" ADD COLUMN "start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_monday" ADD COLUMN "end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_tuesday" ADD COLUMN "start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_tuesday" ADD COLUMN "end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_wednesday" ADD COLUMN "start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_wednesday" ADD COLUMN "end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_thursday" ADD COLUMN "start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_thursday" ADD COLUMN "end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_friday" ADD COLUMN "start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_friday" ADD COLUMN "end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_saturday" ADD COLUMN "start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_saturday" ADD COLUMN "end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_sunday" ADD COLUMN "start_time" timestamp(3) with time zone DEFAULT '2000-01-01T08:00:00.000' NOT NULL;
  ALTER TABLE "businesses_schedule_sunday" ADD COLUMN "end_time" timestamp(3) with time zone DEFAULT '2000-01-01T17:00:00.000' NOT NULL;
  CREATE INDEX "appointments_day_idx" ON "appointments" USING btree ("day");
  ALTER TABLE "businesses_schedule_monday" DROP COLUMN "open";
  ALTER TABLE "businesses_schedule_monday" DROP COLUMN "close";
  ALTER TABLE "businesses_schedule_tuesday" DROP COLUMN "open";
  ALTER TABLE "businesses_schedule_tuesday" DROP COLUMN "close";
  ALTER TABLE "businesses_schedule_wednesday" DROP COLUMN "open";
  ALTER TABLE "businesses_schedule_wednesday" DROP COLUMN "close";
  ALTER TABLE "businesses_schedule_thursday" DROP COLUMN "open";
  ALTER TABLE "businesses_schedule_thursday" DROP COLUMN "close";
  ALTER TABLE "businesses_schedule_friday" DROP COLUMN "open";
  ALTER TABLE "businesses_schedule_friday" DROP COLUMN "close";
  ALTER TABLE "businesses_schedule_saturday" DROP COLUMN "open";
  ALTER TABLE "businesses_schedule_saturday" DROP COLUMN "close";
  ALTER TABLE "businesses_schedule_sunday" DROP COLUMN "open";
  ALTER TABLE "businesses_schedule_sunday" DROP COLUMN "close";`);
}
