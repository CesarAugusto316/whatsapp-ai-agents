import * as migration_20260205_231852_first_commit from './20260205_231852_first_commit';
import * as migration_20260206_005011_products_update from './20260206_005011_products_update';
import * as migration_20260206_163730_update_product from './20260206_163730_update_product';

export const migrations = [
  {
    up: migration_20260205_231852_first_commit.up,
    down: migration_20260205_231852_first_commit.down,
    name: '20260205_231852_first_commit',
  },
  {
    up: migration_20260206_005011_products_update.up,
    down: migration_20260206_005011_products_update.down,
    name: '20260206_005011_products_update',
  },
  {
    up: migration_20260206_163730_update_product.up,
    down: migration_20260206_163730_update_product.down,
    name: '20260206_163730_update_product'
  },
];
