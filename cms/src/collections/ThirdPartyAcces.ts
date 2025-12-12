import type { CollectionConfig } from "payload";

export const ThirdPartyAccess: CollectionConfig = {
  slug: "third-party-access",
  auth: {
    useAPIKey: true,
  },
  fields: [],
};
