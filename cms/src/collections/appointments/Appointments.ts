import type { CollectionConfig } from "payload";
import { AvailabilityRequest } from "./check-availability";
import {
  checkAvailabilityService,
  getSlotsByDayService,
  suggestSlotsService,
} from "./Appointment.service";
import { formatInTimeZone } from "date-fns-tz";

export const Appointments: CollectionConfig = {
  slug: "appointments",
  labels: {
    singular: {
      en: "Reservation",
      es: "Reservación",
    },
    plural: {
      en: "Reservations",
      es: "Reservaciones",
    },
  },
  admin: {
    group: {
      en: "My businesses",
      es: "Mis negocios",
    },
    hideAPIURL: true,
    defaultColumns: [
      "customerName",
      "startDateTime",
      "status",
      "numberOfPeople",
      "business",
    ],
    useAsTitle: "customerName", // header title is taken from "name" field
  },
  timestamps: true,
  access: {
    create: ({ req }) => {
      if (req.user?.collection === "third-party-access") {
        return true;
      }
      return false;
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
  hooks: process.env.IS_CLI
    ? undefined
    : {
        afterRead: [
          async ({ doc, req }) => {
            const isADminPanel =
              req.url.includes("/admin/collections") ||
              req.url.includes("/admin");

            if (!isADminPanel) return doc;

            // when requests goes to the admin panel, then apply business timezone
            const timezone = doc.timezone || "Europe/Madrid"; // Valor por defecto
            return {
              ...doc,
              startDateTime: doc.startDateTime
                ? formatInTimeZone(
                    doc.startDateTime,
                    timezone,
                    "yyyy-MM-dd HH:mm",
                  )
                : undefined,
              endDateTime: doc.endDateTime
                ? formatInTimeZone(
                    doc.endDateTime,
                    timezone,
                    "yyyy-MM-dd HH:mm",
                  )
                : undefined,
            };
          },
        ],
      },
  endpoints: [
    {
      path: "/suggest-slots",
      method: "get",
      handler: async (req) => {
        try {
          const { where } = req.query as unknown as AvailabilityRequest;
          const response = await suggestSlotsService(where); // business query param only
          return Response.json(response, { status: 200 });
        } catch (error) {
          console.error("Error checking availability:", error);
          return Response.json(
            {
              success: false,
              message: "Error al sugerir disponibilidad",
              error: (error as Error).message,
            },
            { status: 500 },
          );
        }
      },
    },
    {
      path: "/get-slots-by-day",
      method: "get",
      handler: async (req) => {
        try {
          const { where } = req.query as unknown as AvailabilityRequest;
          const response = await getSlotsByDayService(where);
          return Response.json(response, { status: 200 });
        } catch (error) {
          console.error("Error checking availability:", error);
          return Response.json(
            {
              success: false,
              message: "Error al sugerir disponibilidad",
              error: (error as Error).message,
            },
            { status: 500 },
          );
        }
      },
    },
    {
      path: "/check-availability",
      method: "get",
      handler: async (req) => {
        try {
          const { where } = req.query as unknown as AvailabilityRequest;
          const response = await checkAvailabilityService(where);
          return Response.json(response, { status: 200 });
        } catch (error) {
          console.error("Error checking availability:", error);
          return Response.json(
            {
              success: false,
              message:
                (error as Error).message || "Error al verificar disponibilidad",
            },
            { status: 500 },
          );
        }
      },
    },
  ],
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
      relationTo: "customers",
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
    // time-zone
    {
      name: "timezone",
      admin: {
        readOnly: true,
      },
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
      label: { en: "Time zone", es: "Zona horaria" },
      required: true,
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
            readOnly: true,
            date: {
              displayFormat: "d MMM yyy HH:mm", // Formato de 24 horas
              timeFormat: "HH:mm", // Formato de 24 horas para el selector de hora
              pickerAppearance: "dayAndTime",
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
            readOnly: true,
            date: {
              displayFormat: "d MMM yyy HH:mm", // Formato de 24 horas
              timeFormat: "HH:mm", // Formato de 24 horas para el selector de hora
              pickerAppearance: "dayAndTime",
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
