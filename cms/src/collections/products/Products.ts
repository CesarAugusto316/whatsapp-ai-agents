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
      type: "row",
      fields: [
        {
          name: "name",
          type: "text",
          admin: {
            width: "50%",
            description: {
              en: "The name of the product",
              es: "El nombre del producto",
            },
            placeholder: {
              en: "e.g. Margherita Pizza",
              es: "ej. Pizza Margarita",
            },
          },
          label: {
            en: "Name",
            es: "Nombre",
          },
          required: true,
        },
        {
          name: "price",
          type: "number",
          admin: {
            width: "50%",
            description: {
              en: "The price of the product",
              es: "El precio del producto",
            },
            placeholder: {
              en: "e.g. 10.99",
              es: "ej. 10.99",
            },
          },
          label: {
            en: "Price",
            es: "Precio",
          },
          required: true,
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "inventory",
          type: "number",
          admin: {
            width: "50%",
            description: {
              en: "The inventory of the product",
              es: "El inventario del producto",
            },
            placeholder: {
              en: "e.g. 10",
              es: "ej. 10",
            },
          },
          label: {
            en: "Inventory",
            es: "Inventario",
          },
        },
        {
          name: "business",
          type: "relationship",
          label: {
            en: "Business",
            es: "Negocio",
          },
          admin: {
            width: "50%",
            description: {
              en: "The business that owns the product",
              es: "El negocio que posee el producto",
            },
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
    },
    {
      name: "description",
      type: "textarea",
      admin: {
        description: {
          en: "The description of the product",
          es: "La descripción del producto",
        },
        placeholder: {
          en: "e.g. This is a great product",
          es: "ej. Este es un gran producto",
        },
      },
      label: {
        en: "Description",
        es: "Descripción",
      },
      required: true,
    },
    {
      name: "estimatedProcessingTime",
      type: "group",
      admin: {
        description: {
          en: "Approximate time range needed to process this item before it is ready. This is informational only.",
          es: "Rango aproximado de tiempo necesario para procesar este producto antes de que esté listo. Solo con fines informativos.",
        },
      },
      label: {
        en: "Estimated Processing Time",
        es: "Tiempo estimado de procesamiento",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "min",
              type: "number",
              admin: {
                width: "33.33%",
                description: {
                  en: "The minimum estimated processing time",
                  es: "El tiempo mínimo estimado de procesamiento",
                },
                placeholder: {
                  en: "e.g. 10",
                  es: "ej. 10",
                },
              },
            },
            {
              name: "max",
              type: "number",
              admin: {
                width: "33.33%",
                description: {
                  en: "The maximum estimated processing time",
                  es: "El tiempo máximo estimado de procesamiento",
                },
                placeholder: {
                  en: "e.g. 30",
                  es: "ej. 30",
                },
              },
            },
            {
              name: "unit",
              type: "select",

              defaultValue: "minutes",
              label: {
                en: "Unit",
                es: "Unidad",
              },
              options: [
                { label: { en: "Minutes", es: "Minutos" }, value: "minutes" },
                { label: { en: "Hours", es: "Horas" }, value: "hours" },
                { label: { en: "Days", es: "Días" }, value: "days" },
              ],
            },
          ],
        },
      ],
    },
  ],

  admin: {
    group: {
      en: "My products",
      es: "Mis productos",
    },
    defaultColumns: ["name", "price", "enabled", "inventory", "business"],
    // hidden: true,
    hideAPIURL: true,
  },
};
