import { es } from "@payloadcms/translations/languages/es";
import { en } from "@payloadcms/translations/languages/en";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { ThirdPartyAccess } from "./collections/ThirdPartyAcces";
import { s3Storage } from "@payloadcms/storage-s3";
// import { migrations } from "./migrations";

// collections
import { Appointments } from "./collections/appointments/Appointments";
import { BusinessMedia } from "./collections/business/Media";
import { Users } from "./collections/Users";
import { Customers } from "./collections/Costumers";
import { Business } from "./collections/business/Businesses";
import { Products } from "./collections/products/Products";
import { ProductsMedia } from "./collections/products/Media";
import { ProductOrder } from "./collections/products/ProductOrder";
import { ProductCarts } from "./collections/products/ProductCart";

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
  bin: [
    {
      scriptPath: path.resolve(dirname, "seed.ts"),
      key: "seed",
    },
  ],
  /**
   *
   * I18N: https://payloadcms.com/docs/configuration/i18n
   */
  i18n: {
    fallbackLanguage: "es", // default,
    supportedLanguages: { en, es },
  },
  admin: {
    meta: {
      keywords: "AI agents, business intelligence, chatbots, whatsapp",
      title: "Dashboard",
      titleSuffix: "Nexoti",
      applicationName: "Nexoti",
      description: "Strategic AI Agents",
      icons: [
        {
          rel: "icon",
          type: "image/png",
          url: "/nexoti_2.png",
        },
      ],
    },
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeNavLinks: [{ path: "./components/Home.tsx" }],
      // Nav: {
      //   path: "./components/Navbar.tsx",
      // },
      graphics: {
        Icon: {
          clientProps: {
            name: "Nexoti",
          },
          path: "./components/Icon.tsx",
        },
        Logo: {
          path: "./components/Logo.tsx",
        },
      },
      beforeDashboard: ["./components/chart-wrapper-container"],
    },
  },
  maxDepth: 2,
  collections: [
    Users,
    ThirdPartyAccess,
    Appointments,
    Customers,
    Business,
    BusinessMedia, // includes file uploads
    Products,
    ProductsMedia, // includes file uploads
    ProductOrder,
    ProductCarts,
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
    push: true,
    idType: "uuid",
    // prodMigrations: migrations, // runs migrations on production on initialization
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
  }),
  plugins: process.env.IS_CLI
    ? undefined
    : [
        // https://bridger.to/payload-r2
        // https://payloadcms.com/posts/guides/how-to-configure-file-storage-in-payload-with-vercel-blob-r2-and-uploadthing
        s3Storage({
          // disableLocalStorage: true,
          collections: {
            "businesses-media": {
              prefix: "business-media", // Optional prefix for uploaded files
              generateFileURL: ({ filename, prefix }) => {
                return `${process.env.PUBLIC_R2}/${prefix}/${filename}`;
              },
            },
            "products-media": {
              prefix: "business-products", // Optional prefix for uploaded files
              generateFileURL: ({ filename, prefix }) => {
                return `${process.env.PUBLIC_R2}/${prefix}/${filename}`;
              },
            },
          },
          bucket: process.env.R2_BUCKET || "",
          config: {
            endpoint: process.env.S3_API || "", // Protocol is required here
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
