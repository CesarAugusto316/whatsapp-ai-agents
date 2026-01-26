import * as migration_20251206_052411_migrate_01 from './20251206_052411_migrate_01';
import * as migration_20251213_001704 from './20251213_001704';
import * as migration_20251217_151602 from './20251217_151602';
import * as migration_20251226_184839_new_appointment_fields from './20251226_184839_new_appointment_fields';
import * as migration_20260101_024344_schedule_dates_to_number from './20260101_024344_schedule_dates_to_number';
import * as migration_20260126_214042_media_collection from './20260126_214042_media_collection';

export const migrations = [
  {
    up: migration_20251206_052411_migrate_01.up,
    down: migration_20251206_052411_migrate_01.down,
    name: '20251206_052411_migrate_01',
  },
  {
    up: migration_20251213_001704.up,
    down: migration_20251213_001704.down,
    name: '20251213_001704',
  },
  {
    up: migration_20251217_151602.up,
    down: migration_20251217_151602.down,
    name: '20251217_151602',
  },
  {
    up: migration_20251226_184839_new_appointment_fields.up,
    down: migration_20251226_184839_new_appointment_fields.down,
    name: '20251226_184839_new_appointment_fields',
  },
  {
    up: migration_20260101_024344_schedule_dates_to_number.up,
    down: migration_20260101_024344_schedule_dates_to_number.down,
    name: '20260101_024344_schedule_dates_to_number',
  },
  {
    up: migration_20260126_214042_media_collection.up,
    down: migration_20260126_214042_media_collection.down,
    name: '20260126_214042_media_collection'
  },
];
