import { es } from "@payloadcms/translations/languages/es";
import { en } from "@payloadcms/translations/languages/en";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import { Users } from "./collections/Users";
import { Appointments } from "./collections/Appointments";
import { Customers } from "./collections/Costumers";
import { Business } from "./collections/Businesses";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  /**
   *
   * I18N: https://payloadcms.com/docs/configuration/i18n
   */
  i18n: {
    fallbackLanguage: "es", // default,
    supportedLanguages: { en, es },
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Appointments, Customers, Business],
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  email: resendAdapter({
    defaultFromAddress: "admin@oist4s.com",
    defaultFromName: "Payload CMS",
    apiKey: process.env.RESEND_API_KEY || "",
  }),
  // database-adapter-config-start
  db: postgresAdapter({
    push: process.env.NODE_ENV === "development",
    idType: "uuid",
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
  }),
});
