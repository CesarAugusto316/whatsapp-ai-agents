import { ragService } from "../services/rag";

const target = process.argv[2];

async function main() {
  if (!target) {
    throw new Error("Specify domain: core | sub | all");
  }

  switch (target) {
    case "reset":
      await ragService.deleteCollections();
      console.log("✅ All collections reset");
      break;

    case "seed":
      await ragService.seedIntents();
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
