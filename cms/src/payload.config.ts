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
    dateFormat: "d MMM yyy HH:mm", // Formato de 24 horas
    meta: {
      keywords: "AI agents, business intelligence, chatbots, whatsapp",
      title: "Dashboard", // for home page
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
    user: Users.slug, // The slug of a Collection to be used to log in to the Admin dashboard.
    importMap: {
      baseDir: path.resolve(dirname),
    },
    /**
     *
     * @description custom components
     * @link https://payloadcms.com/docs/custom-components/overview#building-custom-components
     * @link https://payloadcms.com/docs/custom-components/root-components
     */
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
  /**
   *
   * @link https://payloadcms.com/docs/jobs-queue/overview
   */
  jobs: {
    autoRun: [
      {
        cron: "0 * * * * *", // Cada minuto en el segundo 0
        limit: 500,
        queue: "oneMinute",
      },
      {
        cron: "0 */5 * * * *", // Cada 5 minutos en el segundo 0
        limit: 500,
        queue: "fiveMinutes",
      },
      {
        cron: "0 0 * * * *", // Cada hora en minuto 0, segundo 0
        limit: 500,
        queue: "hourly",
      },
      {
        cron: "0 0 0 * * *", // Cada día a medianoche (00:00:00)
        limit: 500,
        queue: "nightly",
      },
      // add as many cron jobs as you want
    ],
    jobsCollectionOverrides: ({ defaultJobsCollection }) => {
      if (!defaultJobsCollection.admin) {
        defaultJobsCollection.admin = {};
      }

      defaultJobsCollection.admin.hidden =
        process.env.NODE_ENV === "production";
      return defaultJobsCollection;
    },
    tasks: [
      {
        label: "ingestion",
        slug: "semanticSync",
        retries: 3,
        inputSchema: [
          {
            name: "docId", // collection doc content
            type: "text",
            required: true,
          },
          {
            name: "collection", // type: "businesses" | "appointments" | "products"
            type: "text",
            required: true,
          },
          {
            name: "businessId",
            type: "text",
            required: true,
          },
          {
            name: "operation", // create | update | delete
            type: "text",
            required: true,
          },
        ],
        handler: async ({ input }) => {
          try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 20_000); // 20 segundos

            await fetch(
              `${process.env.AGENT_URL}/content/sync-state/${input.businessId}`,
              {
                method: "POST",
                signal: controller.signal,
                headers: {
                  "content-type": "application/json",
                  authorization: `Bearer ${process.env.AGENT_SECRET}`,
                },
                body: JSON.stringify(input),
              },
            );
          } catch (error) {
            console.error("An error occurred in the task semanticSync:", error);
            throw error;
          }
          return { output: { ok: true } };
        },
      },
    ],
  },
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
    /**
     * @description MORE INFO ABOUT PRODUCTION MIGRATIONS:
     * @link https://payloadcms.com/docs/database/migrations#running-migrations-in-production
     */
    push: false,
    // prodMigrations: migrations, // runs migrations on production on initialization
    idType: "uuid",
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
  }),
  plugins: [
    /**
     *
     * @link https://payloadcms.com/posts/guides/how-to-configure-file-storage-in-payload-with-vercel-blob-r2-and-uploadthing
     * @link https://bridger.to/payload-r2
     */
    s3Storage({
      disableLocalStorage: true,
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
