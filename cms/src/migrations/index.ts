import * as migration_20260130_131720_fist_migration from './20260130_131720_fist_migration';

export const migrations = [
  {
    up: migration_20260130_131720_fist_migration.up,
    down: migration_20260130_131720_fist_migration.down,
    name: '20260130_131720_fist_migration'
  },
];
