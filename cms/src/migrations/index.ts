import * as migration_20260205_210010_first_commit from './20260205_210010_first_commit';

export const migrations = [
  {
    up: migration_20260205_210010_first_commit.up,
    down: migration_20260205_210010_first_commit.down,
    name: '20260205_210010_first_commit'
  },
];
