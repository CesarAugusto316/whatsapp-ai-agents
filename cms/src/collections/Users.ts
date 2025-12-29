import type { Access, CollectionConfig } from "payload";

const isAdmin: Access = ({ req }) => {
  if (req.user?.collection === "users") {
    return req?.user?.role === "admin";
  }
  if (req.user?.collection === "third-party-access") {
    return true;
  }
};

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
      return user?.collection === "users" && user?.role !== "admin";
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
  fields: [
    // Email added by default
    // Add more fields as needed
    {
      name: "role",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Business", value: "business" },
      ],
      defaultValue: "business",
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
