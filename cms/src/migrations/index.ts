import * as migration_20260130_175001_first_commit from './20260130_175001_first_commit';
import * as migration_20260201_210323_jobs_queues from './20260201_210323_jobs_queues';

export const migrations = [
  {
    up: migration_20260130_175001_first_commit.up,
    down: migration_20260130_175001_first_commit.down,
    name: '20260130_175001_first_commit',
  },
  {
    up: migration_20260201_210323_jobs_queues.up,
    down: migration_20260201_210323_jobs_queues.down,
    name: '20260201_210323_jobs_queues'
  },
];
