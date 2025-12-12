import type { CollectionConfig, CollectionSlug } from "payload";
import { Business } from "./Businesses";
import { Customers } from "./Costumers";

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
    useAsTitle: "startDateTime", // header title is taken from "name" field
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
    {
      name: "business",
      type: "relationship",
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
    {
      name: "customer",
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
    {
      type: "row",
      fields: [
        {
          name: "startDateTime",
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
          type: "date",
          label: {
            en: "End Time",
            es: "Hora de fin",
          },
          required: true,
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
  ],
};
