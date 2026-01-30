import type { CollectionConfig } from "payload";

export const ProductsMedia: CollectionConfig = {
  slug: "products-media",
  labels: {
    singular: {
      en: "Product Media",
      es: "Elemento de Producto",
    },
    plural: {
      en: "Products Media",
      es: "Galería de Productos",
    },
  },
  access: {
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
      name: "product",
      type: "relationship",
      label: {
        en: "Product",
        es: "Producto",
      },
      required: true,
      relationTo: "products",
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
    {
      name: "business",
      type: "relationship",
      label: {
        en: "Business",
        es: "Negocio",
      },
      required: true,
      hidden: true,
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
    hidden: true,
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
