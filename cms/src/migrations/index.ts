import * as migration_20251206_052411_migrate_01 from './20251206_052411_migrate_01';

export const migrations = [
  {
    up: migration_20251206_052411_migrate_01.up,
    down: migration_20251206_052411_migrate_01.down,
    name: '20251206_052411_migrate_01'
  },
];
