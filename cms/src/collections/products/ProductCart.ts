import type { CollectionConfig } from "payload";

export const ProductCarts: CollectionConfig = {
  slug: "product-cart",
  labels: {
    singular: {
      en: "Cart",
      es: "Carrito",
    },
    plural: {
      en: "Cart",
      es: "Carrito",
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
    group: {
      en: "My products",
      es: "Mis productos",
    },
    hidden: true,
    hideAPIURL: true,
  },
};
