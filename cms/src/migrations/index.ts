import * as migration_20251206_052411_migrate_01 from './20251206_052411_migrate_01';
import * as migration_20251213_001704 from './20251213_001704';

export const migrations = [
  {
    up: migration_20251206_052411_migrate_01.up,
    down: migration_20251206_052411_migrate_01.down,
    name: '20251206_052411_migrate_01',
  },
  {
    up: migration_20251213_001704.up,
    down: migration_20251213_001704.down,
    name: '20251213_001704'
  },
];
