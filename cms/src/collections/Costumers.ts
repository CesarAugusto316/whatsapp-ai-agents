import { CollectionConfig, CollectionSlug } from "payload";
import { Business } from "./Businesses";

export const Customers: CollectionConfig = {
  slug: "customers",
  labels: {
    singular: {
      en: "Customer",
      es: "Cliente",
    },
    plural: {
      en: "Customers",
      es: "Clientes",
    },
  },
  
  admin: {
    useAsTitle: "name", // header title is taken from "name" field
  },
  access: {
    create: ({ req }) => {
      return req.user?.role === "admin";
    },
    read: async ({ req }) => {
      // Si el usuario es un administrador, permite el acceso a todos los documentos.
      if (!req?.user) {
        return false;
      }
      if (req.user?.role === "admin") {
        return true;
      }
      return {
        "business.user": {
          equals: req.user?.id,
        },
      };
    },
  },
  timestamps: true,
  fields: [
    {
      name: "phoneNumber",
      type: "text",
      required: true,
      unique: false, // un cliente puede el mismo numero y usar en negocios diferentes
      label: { en: "Phone Number", es: "Número de Teléfono" },
      defaultValue: "+34",
      minLength: 7,
      maxLength: 20,
      access: {
        update: ({ req }) => req.user?.role === "admin",
      },
    },
    {
      name: "business",
      type: "relationship",
      label: {
        en: "Business",
        es: "Negocio",
      },
      relationTo: Business.slug as CollectionSlug,
      required: true,
      access: {
        update: ({ req }) => req.user?.role === "admin",
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: { en: "Full Name", es: "Nombre Completo" },
      access: {
        update: ({ req }) => req.user?.role === "admin",
      },
    },
    {
      name: "block",
      type: "checkbox",
      label: { en: "Block costumer", es: "Bloquear cliente" },
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: {
          en: "Allow user to block costumers for bad behavior",
          es: "Te permite sancionar clientes por mal comportamiento",
        },
      },
      access: {
        update: () => true,
      },
    },
    {
      name: "email",
      type: "email",
      label: { en: "Email", es: "Correo Electrónico" },
      access: {
        update: ({ req }) => req.user?.role === "admin",
      },
    },
  ],
};
