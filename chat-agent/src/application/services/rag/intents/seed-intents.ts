import {
  bookingIntents,
  deliveryIntents,
  globalIntents,
  eroticIntents,
  restaurantIntents,
  ragService,
} from "@/application/services/rag";

export const seedIntents = {
  coreDomain: async () => {
    const filteredIntents = [
      ...globalIntents,
      ...bookingIntents,
      ...deliveryIntents,
    ];
    await ragService.init();
    return ragService.upsertIntents(filteredIntents);
  },
  subDomains: async () => {
    const intentsMap = [...restaurantIntents, ...eroticIntents];
    await ragService.init();
    return ragService.upsertIntents(intentsMap);
  },
};
