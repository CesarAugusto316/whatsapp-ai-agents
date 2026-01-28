import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: {
      en: "Media",
      es: "Elemento",
    },
    plural: {
      en: "Media",
      es: "Galería",
    },
  },
  access: {
    // create: ({ req }) => {
    //   if (req.user?.collection === "third-party-access") {
    //     return true;
    //   }
    //   if (req?.user?.collection === "users") {
    //     return req?.user?.role === "admin";
    //   }
    // }, // bot
    // Función read corregida:
    read: async ({ req }) => {
      if (req?.user?.collection === "third-party-access") {
        return true;
      }
      const { user } = req;
      if (user?.collection === "users") {
        if (user?.role === "admin") {
          return true;
        }
        if (user?.role === "business") {
          // En lugar de hacer una consulta, filtramos por "negocios del usuario actual"
          // Esto requiere que la relación "business" esté configurada correctamente
          return {
            or: [
              {
                // Filtra por negocios que tengan este usuario como propietario
                // (Requiere que Payload pueda hacer joins en las queries)
                "business.general.user": {
                  equals: user.id,
                },
              },
              // Permite ver interfaz aunque no tenga citas
              {
                id: {
                  exists: false,
                },
              },
            ],
          };
        }
      }
      return false;
    },
  },
  timestamps: true,
  fields: [
    {
      name: "alt",
      type: "text",
      label: {
        en: "Alternative Text",
        es: "Texto Alternativo",
      },
      required: true,
    },
    {
      name: "business",
      type: "relationship",
      index: true,
      label: {
        en: "Business",
        es: "Negocio",
      },
      required: true,
      relationTo: "businesses",
      access: {
        update: ({ req }) => {
          if (req?.user?.collection === "third-party-access") {
            return true;
          }
          return (
            req?.user?.collection === "users" && req?.user?.role === "admin"
          );
        },
      },
    },
  ],
  admin: {
    hideAPIURL: true,
  },
  upload: {
    // disableLocalStorage: env.NODE_ENV === "production",
    // staticDir: path.resolve(__dirname, "../media"),
    formatOptions: {
      format: "webp", // Convert uploads to WebP
      options: {
        quality: 80,
      },
    },
    mimeTypes: ["image/*", "video/*"],
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
};
