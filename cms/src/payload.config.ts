import { es } from "@payloadcms/translations/languages/es";
import { en } from "@payloadcms/translations/languages/en";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import { Users } from "./collections/Users";
import { Customers } from "./collections/Costumers";
import { Business } from "./collections/Businesses";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { ThirdPartyAccess } from "./collections/ThirdPartyAcces";
import { Appointments } from "./collections/appointments/Appointments";
import { s3Storage } from "@payloadcms/storage-s3";
import { Media } from "./collections/Media";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 *
 * @description custom components
 * @link https://recharts.github.io/en-US/examples/TimelineExample/
 * @link https://payloadcms.com/docs/custom-components/overview#building-custom-components
 * @link https://payloadcms.com/docs/custom-components/root-components
 */
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
    // timezones: {},
    dateFormat: "MMMM do, yyyy",
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      // views: {
      //   // ["sas"]: {
      //   //   // path: ""
      //   // },
      // }
      afterDashboard: ["./components/example"],
    },
  },
  maxDepth: 2,
  collections: [
    Users,
    ThirdPartyAccess,
    Appointments,
    Customers,
    Business,
    Media,
  ],
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
    // MORE INFO ABOUT PRODUCTION MIGRATIONS:
    // https://payloadcms.com/docs/database/migrations#running-migrations-in-production
    // push: process.env.NODE_ENV === "development",
    push: false,
    idType: "uuid",
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
  }),
  plugins: [
    // https://bridger.to/payload-r2
    // https://payloadcms.com/posts/guides/how-to-configure-file-storage-in-payload-with-vercel-blob-r2-and-uploadthing
    s3Storage({
      disableLocalStorage: false,
      collections: {
        media: {
          disableLocalStorage: true, // Recommended for production
          prefix: "media", // Optional prefix for uploaded files
          generateFileURL: ({ filename, prefix }) =>
            `https://${process.env.R2_BUCKET}.${process.env.R2_ENDPOINT}/${prefix}/${filename}`,
        },
      },
      bucket: process.env.R2_BUCKET || "",
      config: {
        endpoint: `https://${process.env.R2_ENDPOINT}` || "", // Protocol is required here
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
        region: "auto", // Required for R2
        forcePathStyle: true, // Required for R2
      },
    }),
  ],
});
