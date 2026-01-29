import type { CollectionConfig } from "payload";

export const ProductCarts: CollectionConfig = {
  slug: "product-cart",
  labels: {
    singular: {
      en: "Product Cart",
      es: "Carrito de Producto",
    },
    plural: {
      en: "Products Cart",
      es: "Carrito de Productos",
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
    // read: async ({ req }) => {
    //   if (req?.user?.collection === "third-party-access") {
    //     return true;
    //   }
    //   const { user } = req;
    //   if (user?.collection === "users") {
    //     if (user?.role === "admin") {
    //       return true;
    //     }
    //     if (user?.role === "business") {
    //       // En lugar de hacer una consulta, filtramos por "negocios del usuario actual"
    //       // Esto requiere que la relación "business" esté configurada correctamente
    //       return {
    //         or: [
    //           {
    //             // Filtra por negocios que tengan este usuario como propietario
    //             // (Requiere que Payload pueda hacer joins en las queries)
    //             "business.general.user": {
    //               equals: user.id,
    //             },
    //           },
    //           // Permite ver interfaz aunque no tenga citas
    //           {
    //             id: {
    //               exists: false,
    //             },
    //           },
    //         ],
    //       };
    //     }
    //   }
    //   return false;
    // },
  },
  timestamps: true,
  fields: [
    {
      name: "quantity",
      type: "number",
      label: {
        en: "Quantity",
        es: "Cantidad",
      },
    },
    {
      name: "order",
      type: "relationship",
      relationTo: "product-order",
      label: {
        en: "Order",
        es: "Orden",
      },
      required: true,
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
};
