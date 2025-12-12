import type { Access, CollectionConfig } from "payload";

const isAdmin: Access = ({ req }) => {
  if (req.user?.collection === "users") {
    return req?.user?.role === "admin";
  }
  if (req.user?.collection === "third-party-access") {
    return true;
  }
};

export const ThirdPartyAccess: CollectionConfig = {
  slug: "third-party-access",
  auth: {
    useAPIKey: true,
  },
  access: {
    read: isAdmin,
    update: isAdmin,
    create: isAdmin,
    delete: isAdmin,
  },
  fields: [],
};
