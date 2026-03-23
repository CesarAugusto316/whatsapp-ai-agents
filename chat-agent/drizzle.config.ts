import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infraestructure/adapters/db/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    // @ts-ignore
    url: process?.env.DATABASE_URI!,
  },
  out: "./src/infraestructure/adapters/db/drizzle",
});
