import { seedIntents } from "../services/rag";

const target = process.argv[2];

async function main() {
  if (!target) {
    throw new Error("Specify domain: core | sub | all");
  }

  switch (target) {
    case "core":
      await seedIntents.coreDomain();
      console.log("✅ Core intents seeded");
      break;

    case "sub":
      await seedIntents.subDomains();
      console.log("✅ Subdomain intents seeded");
      break;

    case "all":
      await seedIntents.coreDomain();
      await seedIntents.subDomains();
      console.log("✅ All intents seeded");
      break;

    default:
      throw new Error("Invalid option: core | sub | all");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
