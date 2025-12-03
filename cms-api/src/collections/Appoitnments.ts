// restaurante
// numero de mesas

// citas medicas/atencion al cliente

// horario/calendario
// tiempo cita: 1h
// observaciones
//
//
import type { CollectionConfig } from "payload";

export const Appointment: CollectionConfig = {
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
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: "Inicio",
      type: "date",
      required: true,
      label: {
        en: "Start Date",
        es: "Fecha de inicio",
      },
      admin: {
        date: {
          pickerAppearance: "timeOnly",
        },
      },
    },
    {
      name: "Final",
      type: "date",
      required: true,
      label: {
        en: "End Date",
        es: "Fecha de finalización",
      },
      admin: {
        date: {
          pickerAppearance: "timeOnly",
        },
      },
    },
  ],
};
