import type { CollectionConfig } from "payload";

export const ProductOrder: CollectionConfig = {
  slug: "product-order",
  labels: {
    singular: {
      en: "Order",
      es: "Orden",
    },
    plural: {
      en: "Orders",
      es: "Ordenes",
    },
  },
  access: {
    create: ({ req }) => {
      if (req.user?.collection === "third-party-access") {
        return true;
      }
      if (req?.user?.collection === "users") {
        return req?.user?.role === "admin";
      }
    }, // bot
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
      name: "description",
      type: "textarea",
      label: {
        en: "Description",
        es: "Descripción",
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

    {
      name: "customer",
      type: "relationship",
      label: {
        en: "Customer",
        es: "Cliente",
      },
      required: true,
      relationTo: "customers",
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
    group: {
      en: "My products",
      es: "Mis productos",
    },
    // hidden: true,
    hideAPIURL: true,
  },
};
