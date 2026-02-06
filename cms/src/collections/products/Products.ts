import type { CollectionConfig } from "payload";

export const Products: CollectionConfig = {
  slug: "products",
  labels: {
    singular: {
      en: "Product",
      es: "Producto",
    },
    plural: {
      en: "Products",
      es: "Productos",
    },
  },
  hooks: process.env.IS_CLI
    ? undefined
    : {
        afterChange: [
          async ({ doc, operation, req }) => {
            await req.payload.jobs.queue({
              task: "semanticSync",
              input: {
                docId: doc.id,
                collection: "products",
                businessId:
                  typeof doc.business === "string"
                    ? doc.business
                    : doc.business.id,
                operation: operation, // create | update
              },
              queue: "oneMinute",
            });
            return doc;
          },
        ],
        afterDelete: [
          async ({ doc, req }) => {
            await req.payload.jobs.queue({
              task: "semanticSync",
              input: {
                docId: doc.id,
                collection: "products",
                businessId:
                  typeof doc.business === "string"
                    ? doc.business
                    : doc.business?.id,
                operation: "delete",
              },
              queue: "oneMinute",
            });
            return doc;
          },
        ],
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
      name: "name",
      type: "text",
      label: {
        en: "Name",
        es: "Nombre",
      },
      required: true,
    },
    {
      name: "price",
      type: "number",
      label: {
        en: "Price",
        es: "Precio",
      },
      required: true,
    },
    {
      name: "inventory",
      type: "number",
      label: {
        en: "Inventory",
        es: "Inventario",
      },
    },
    {
      name: "enabled",
      type: "checkbox",
      label: {
        en: "Enabled",
        es: "Activo",
      },
      required: true,
      defaultValue: true,
    },
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
    group: {
      en: "My products",
      es: "Mis productos",
    },
    // hidden: true,
    hideAPIURL: true,
  },
};
