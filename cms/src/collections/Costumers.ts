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
      if (req?.user?.collection === "third-party-access") {
        return true;
      }
      return req?.user?.collection === "users" && req?.user?.role === "admin";
    },
    read: async ({ req }) => {
      if (req?.user?.collection === "third-party-access") {
        return true;
      }
      // Si el usuario es un administrador, permite el acceso a todos los documentos.
      if (!req?.user) {
        return false;
      }
      if (req.user?.role === "admin") {
        return true;
      }
      if (req.user?.role === "business") {
        // En lugar de hacer una consulta, filtramos por "negocios del usuario actual"
        // Esto requiere que la relación "business" esté configurada correctamente
        return {
          or: [
            {
              // Filtra por negocios que tengan este usuario como propietario
              // (Requiere que Payload pueda hacer joins en las queries)
              "business.general.user": {
                equals: req.user.id,
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
      return false;
    },
  },
  timestamps: true,
  fields: [
    {
      name: "phoneNumber",
      type: "text",
      required: true,
      index: true,
      unique: false, // un cliente puede el mismo numero y usar en negocios diferentes
      label: { en: "Phone Number", es: "Número de Teléfono" },
      defaultValue: "+34",
      minLength: 7,
      maxLength: 20,
      admin: {
        readOnly: true,
      },
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
      name: "business",
      type: "relationship",
      label: {
        en: "Business",
        es: "Negocio",
      },
      relationTo: Business.slug as CollectionSlug,
      required: true,
      admin: {
        readOnly: true,
      },
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
      name: "name",
      type: "text",
      required: true,
      label: { en: "Full Name", es: "Nombre Completo" },
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
