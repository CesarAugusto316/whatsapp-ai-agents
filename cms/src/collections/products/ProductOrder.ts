import type { CollectionConfig } from "payload";

export const ProductOrder: CollectionConfig = {
  slug: "product-orders",
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
      admin: {
        description: {
          en: "Order Description",
          es: "Descripción del pedido",
        },
      },
      required: false,
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

    {
      /**
       *
       *  {
       *    items: {
       *      productId: string,
       *      productName: string,
       *      quantity: number,
       *      price: number,
       *      subTotal: number,
       *      observations: string
       *    } [],
       *    total: number
       *  }
       */
      type: "json",
      name: "cart",
      label: {
        en: "Cart",
        es: "Carrito",
      },
      required: true,
    },

    // status
    {
      name: "status",
      type: "select",
      label: {
        en: "Status",
        es: "Estado",
      },
      admin: {
        description: {
          en: "Status of the order",
          es: "Estado del pedido",
        },
      },
      required: true,
      defaultValue: "confirmed",
      access: {
        update: ({ req }) => {
          if (req?.user?.collection === "third-party-access") {
            return true;
          }
          return (
            req?.user?.collection === "users" &&
            (req?.user?.role === "admin" || req?.user?.role === "business")
          );
        },
      },
      options: [
        { value: "confirmed", label: { en: "Confirmed", es: "Confirmada" } },
        { value: "cancelled", label: { en: "Cancelled", es: "Cancelada" } },
        { value: "completed", label: { en: "Completed", es: "Completada" } },
      ],
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
