import { env, SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

const client = new SQL(env.DATABASE_URI!);
export const db = drizzle({ client });
