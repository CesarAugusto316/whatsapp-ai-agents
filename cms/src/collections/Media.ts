import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: {
      en: "Media",
      es: "Elemento",
    },
    plural: {
      en: "Media",
      es: "Galería",
    },
  },
  access: {
    read: () => true,
  },
  timestamps: true,
  fields: [
    {
      name: "alt",
      type: "text",
      label: {
        en: "Alternative Text",
        es: "Texto Alternativo",
      },
      required: true,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
};
