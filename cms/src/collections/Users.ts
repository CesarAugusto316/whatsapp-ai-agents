import type { Access, CollectionConfig } from "payload";

const isAdmin: Access = ({ req }) => req?.user?.role === "admin";

/**
 *
 * I18N: https://payloadcms.com/docs/configuration/i18n
 */
export const Users: CollectionConfig = {
  slug: "users",
  timestamps: true,
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
    // hide all the page if user is not admin
    hidden: ({ user }) => {
      return user?.role !== "admin";
    },
    useAsTitle: "name", // header title is taken from "name" field
  },
  access: {
    // Solo los administradores pueden crear nuevos usuarios
    create: isAdmin,
    update: ({ req, id }) => req?.user?.id === id,
    delete: isAdmin,
  },
  auth: true,
  /**
   *
   * @description UUIDV7: https://payloadcms.com/community-help/github/how-to-implement-automatic-custom-id
   */
  // hooks: {
  //     beforeValidate: [({ data }) => {
  //       if (!data.id) {
  //         // replace with your own way to generate IDs
  //         const customID = uuid()
  //         return {...data, id: customID }
  //       }
  //       return data
  //     }],
  //   },
  fields: [
    // Email added by default
    // Add more fields as needed
    {
      name: "role",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Business", value: "business" },
        // { label: "Bot", value: "bot" },
      ],
      defaultValue: "admin",
      required: true,
      saveToJWT: true,
      label: {
        en: "Role",
        es: "Rol",
      },
      access: {
        update: () => false,
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
      defaultValue: "",
      admin: {
        placeholder: "Enter your name",
      },
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
      defaultValue: "+34",
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
