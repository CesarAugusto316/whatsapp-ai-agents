import * as migration_20250929_111647 from "./20250929_111647";

// MORE INFO: https://payloadcms.com/docs/database/migrations
export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: "20250929_111647",
  },
];
