import type { CollectionConfig, CollectionSlug } from "payload";
import { Business } from "./Businesses";
import { Customers } from "./Costumers";

// TODO: NORMALIZE DATES
export const Appointments: CollectionConfig = {
  slug: "appointments",
  labels: {
    singular: {
      en: "Appointment",
      es: "Cita",
    },
    plural: {
      en: "Appointments",
      es: "Citas",
    },
  },
  admin: {
    useAsTitle: "customerName", // header title is taken from "name" field
  },
  timestamps: true,
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
  fields: [
    // businessId
    {
      name: "business",
      type: "relationship",
      index: true,
      label: {
        en: "Business",
        es: "Negocio",
      },
      admin: {
        readOnly: true,
      },
      required: true,
      relationTo: Business.slug as CollectionSlug,
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
    // customerId
    {
      name: "customer",
      index: true,
      type: "relationship",
      admin: {
        readOnly: true,
      },
      label: {
        en: "Customer",
        es: "Cliente",
      },
      required: true,
      relationTo: Customers.slug as CollectionSlug,
      access: {
        update: ({ req }) => {
          if (req.user?.collection === "third-party-access") {
            return true;
          }
          return (
            req?.user?.collection === "users" && req?.user?.role === "admin"
          );
        },
      },
    },
    // customerName
    {
      name: "customerName",
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
      type: "text",
      label: { en: "Customer Name", es: "A nombre de" },
    },
    // time: startDateTime - endDateTime
    {
      type: "row",
      fields: [
        {
          name: "startDateTime",
          index: true,
          type: "date",
          label: {
            en: "Start Time",
            es: "Hora de inicio",
          },
          required: true,
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
          admin: {
            date: {
              pickerAppearance: "timeOnly",
              timeFormat: "HH:mm",
              displayFormat: "HH:mm",
            },
          },
        },
        {
          name: "endDateTime",
          index: true,
          type: "date",
          label: {
            en: "End Time",
            es: "Hora de fin",
          },
          required: false,
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
          admin: {
            date: {
              pickerAppearance: "timeOnly",
              timeFormat: "HH:mm",
              displayFormat: "HH:mm",
            },
          },
        },
      ],
    },
    // status
    {
      name: "status",
      type: "select",
      label: {
        en: "Status",
        es: "Estado",
      },
      required: true,
      defaultValue: "pending",
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
        { value: "pending", label: { en: "Pending", es: "Pendiente" } },
        { value: "confirmed", label: { en: "Confirmed", es: "Confirmada" } },
        { value: "cancelled", label: { en: "Cancelled", es: "Cancelada" } },
        { value: "completed", label: { en: "Completed", es: "Completada" } },
      ],
    },
    // number of people
    {
      type: "number",
      name: "numberOfPeople",
      defaultValue: 1,
      admin: {
        readOnly: true,
        // condition: (data) => {
        //   console.log({ data });
        //   // data: {
        //   //    id: 'c948628b-02d0-4088-84df-b1c8b91b1c9d',
        //   //    business: '71358eb4-b61e-418d-a2fe-e34b8e5c5e6c',
        //   //    customer: '1cf18943-2a2b-46de-b9fb-5407afce47ae',
        //   //    customerName: 'Cesar',
        //   //    day: '2025-12-31T00:00:00.000Z',
        //   //    startDateTime: '2025-12-31T16:00:00.000Z',
        //   //    endDateTime: '2025-12-31T17:00:00.000Z',
        //   //    status: 'confirmed',
        //   //    numberOfPeople: 3,
        //   //    notes: null,
        //   //    updatedAt: '2025-12-26T18:57:52.198Z',
        //   //    createdAt: '2025-12-26T18:57:52.197Z'
        //   //  }
        //   return true;
        // },
      },
      label: { en: "Number of People", es: "Número de Personas" },
      min: 1,
      max: 100,
    },
    // notes
    {
      name: "notes",
      type: "textarea",
      label: { en: "Notes", es: "Observaciones" },
    },
  ],
};
