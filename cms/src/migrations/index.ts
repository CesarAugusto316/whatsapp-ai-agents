import * as migration_20260215_190541_first_commit from './20260215_190541_first_commit';
import * as migration_20260217_132406_business_update from './20260217_132406_business_update';

export const migrations = [
  {
    up: migration_20260215_190541_first_commit.up,
    down: migration_20260215_190541_first_commit.down,
    name: '20260215_190541_first_commit',
  },
  {
    up: migration_20260217_132406_business_update.up,
    down: migration_20260217_132406_business_update.down,
    name: '20260217_132406_business_update'
  },
];
