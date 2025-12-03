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
    // --- CAMBIO AQUÍ ---
    read: ({ req }) => {
      const { user } = req;

      // 1. Si el usuario es un administrador, puede ver todas las citas.
      if (user?.role === "admin") {
        return true;
      }

      // 2. Si es un usuario de negocio, filtra las citas para mostrar solo
      //    aquellas que pertenecen a sus negocios.
      if (user?.role === "business") {
        return {
          "business.user": {
            equals: user.id,
          },
        };
      }

      // 3. Para cualquier otro caso, no se muestran citas.
      //    Podrías añadir lógica para que los clientes vean las suyas si fuera necesario.
      return false;
    },
    create: ({ req }) => req.user?.role === "admin", // bot
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
        update: ({ req }) => req.user?.role === "admin",
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
        update: ({ req }) => req.user?.role === "admin",
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
            update: ({ req }) => req.user?.role === "admin",
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
            update: ({ req }) => req.user?.role === "admin",
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
        update: ({ req }) => req.user?.role === "admin",
      },
    },
  ],
};
