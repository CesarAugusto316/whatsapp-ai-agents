// MORE INFO: https://payloadcms.com/docs/database/sqlite
import { es } from "@payloadcms/translations/languages/es";
import { en } from "@payloadcms/translations/languages/en";
import { buildConfig } from "payload";
import { Users } from "./collections/Users";
import { Appointment } from "./collections/Appoitnments";
import { sqliteAdapter } from "@payloadcms/db-sqlite";

export default buildConfig({
  /**
   *
   * I18N: https://payloadcms.com/docs/configuration/i18n
   */
  i18n: {
    fallbackLanguage: "es", // default,
    supportedLanguages: { en, es },
  },
  collections: [Users, Appointment],
  // editor: lexicalEditor(),
  secret: process.env?.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: "./payload-types.ts",
  },
  db: sqliteAdapter({
    client: {
      url: process.env?.TURSO_URL!,
      // authToken: process.env?.TURSO_AUTH_TOKEN!,
    },
  }),

  // plugins: [
  //   // storage-adapter-placeholder
  // ],
});
