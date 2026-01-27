import payload, { SanitizedConfig } from "payload";

// Script must define a "script" function export that accepts the sanitized config
export const script = async (config: SanitizedConfig) => {
  await payload.init({ config });
  const user = await payload.create({
    collection: "users",
    data: {
      email: "riveramirandac@gmail.com",
      password: "demo",
      role: "admin",
      name: "César Rivera",
      phoneNumber: "+521234567890",
    },
  });
  await payload.create({
    collection: "users",
    data: {
      email: "user_01@gmail.com",
      password: "demo",
      role: "admin",
      name: "user_01",
      phoneNumber: "+521234567777",
    },
  });
  await payload.create({
    collection: "users",
    data: {
      email: "user_02@example.com",
      password: "demo",
      role: "business",
      name: "user_02",
      phoneNumber: "+521234567888",
    },
  });
  await payload.create({
    showHiddenFields: true,
    collection: "businesses",
    data: {
      name: "Business Name",
      schedule: { averageTime: 60 },
      general: {
        nextHoliday: [
          {
            endDate: new Date().toISOString(),
            startDate: new Date().toISOString(),
          },
        ],
        businessType: "restaurant",
        phoneNumber: "+521234567899",
        description: "",
        timezone: "Europe/Madrid",
        isActive: true,
        requireAppointmentApproval: false,
        maxCapacity: 40,
        user: user.id,
      },
    },
  });
  payload.logger.info("Successfully seeded!");
  process.exit(0);
};
