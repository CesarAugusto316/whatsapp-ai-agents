import type { CollectionConfig } from "payload";

/**
 *
 * I18N: https://payloadcms.com/docs/configuration/i18n
 */
export const Users: CollectionConfig = {
  slug: "users",
  labels: {
    singular: {
      en: "User",
      es: "Usuario",
    },
    plural: {
      en: "Users",
      es: "Usuarios",
    },
  },
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  access: {
    // 🔓 Permite crear usuarios sin estar logueado
    create: () => true,
    // read: () => true, // O usa lógica de autenticación
    // update: ({req}) => ({}),
    // delete: ({ req }) => req.user,
  },
  fields: [
    // Email added by default
    // Add more fields as needed
    {
      name: "name",
      type: "text",
      required: true,
      defaultValue: "John Doe",
      saveToJWT: true,
      minLength: 3,
      maxLength: 20,
      label: {
        en: "Name",
        es: "Nombre",
      },
    },
    {
      name: "phoneNumber",
      type: "text",
      required: false,
      defaultValue: "+1",
      unique: true,
      minLength: 7,
      maxLength: 20,
      label: {
        en: "Phone Number",
        es: "Número de teléfono",
      },
    },
  ],
};
