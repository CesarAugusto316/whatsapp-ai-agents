import * as migration_20260130_175001_first_commit from './20260130_175001_first_commit';

export const migrations = [
  {
    up: migration_20260130_175001_first_commit.up,
    down: migration_20260130_175001_first_commit.down,
    name: '20260130_175001_first_commit'
  },
];
