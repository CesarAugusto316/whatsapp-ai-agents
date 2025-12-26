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
      type: "text",
      label: { en: "Customer Name", es: "Nombre del Cliente" },
    },
    // day
    {
      name: "day",
      index: true,
      type: "date",
      label: {
        en: "Day",
        es: "Día",
      },
      required: true,
      // defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
      defaultValue: new Date().toISOString(),
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
      admin: {
        date: {
          pickerAppearance: "dayOnly",
          // timeFormat: "HH:mm",
          // displayFormat: "HH:mm",
        },
      },
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
          defaultValue: "2000-01-01T08:00:00.000", // Fecha fija de referencia
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
          defaultValue: "2000-01-01T17:00:00.000", // Fecha fija de referencia
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
      options: [
        { value: "pending", label: { en: "Pending", es: "Pendiente" } },
        { value: "confirmed", label: { en: "Confirmed", es: "Confirmada" } },
        { value: "cancelled", label: { en: "Cancelled", es: "Cancelada" } },
        { value: "completed", label: { en: "Completed", es: "Completada" } },
      ],
    },
    // notes
    {
      name: "notes",
      type: "textarea",
      label: { en: "Notes", es: "Observaciones" },
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
    // number of people
    {
      type: "number",
      name: "numberOfPeople",
      defaultValue: 1,
      admin: {
        condition: (data) =>
          data?.business?.general?.businessType === "restaurant",
      },
      label: { en: "Tables Number", es: "Número de Mesas" },
      min: 1,
      max: 100,
    },
  ],
};
