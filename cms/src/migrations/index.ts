import * as migration_20260130_175001_first_commit from './20260130_175001_first_commit';
import * as migration_20260201_210323_jobs_queues from './20260201_210323_jobs_queues';
import * as migration_20260202_041844_tasks from './20260202_041844_tasks';
import * as migration_20260205_030025_updates from './20260205_030025_updates';

export const migrations = [
  {
    up: migration_20260130_175001_first_commit.up,
    down: migration_20260130_175001_first_commit.down,
    name: '20260130_175001_first_commit',
  },
  {
    up: migration_20260201_210323_jobs_queues.up,
    down: migration_20260201_210323_jobs_queues.down,
    name: '20260201_210323_jobs_queues',
  },
  {
    up: migration_20260202_041844_tasks.up,
    down: migration_20260202_041844_tasks.down,
    name: '20260202_041844_tasks',
  },
  {
    up: migration_20260205_030025_updates.up,
    down: migration_20260205_030025_updates.down,
    name: '20260205_030025_updates'
  },
];
