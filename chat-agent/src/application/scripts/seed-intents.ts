import { intentExamples, ragService } from "../services/rag";

const target = process.argv[2];
const forceFlag = process.argv.includes("--force");

async function main() {
  if (!target) {
    console.log(`
Usage:
  bun vector:reset          - Delete all collections
  bun vector:seed           - Seed all intents
  bun vector:refresh        - Update intents (no delete)
  bun vector:verify         - Verify setup
    `);
    process.exit(1);
  }

  switch (target) {
    case "reset":
      if (process.env.NODE_ENV === "production" && !forceFlag) {
        console.error("❌ Use --force to reset in production");
        process.exit(1);
      }

      console.log("🗑️  Deleting collections...");
      await ragService.deleteCollections();
      console.log("✅ All collections reset");
      break;

    case "seed":
      console.log("🌱 Seeding intents...");

      await ragService.seedIntents();

      const total = intentExamples.flatMap((i) => i.examples).length;
      console.log("✅ Intents seeded:");
      console.log(`   Total examples vectorized: ${total}`);
      break;

    case "refresh":
      console.log("🔄 Refreshing intents (upsert mode)...");
      await ragService.seedIntents(); // Usa upsert internamente
      console.log("✅ Intents refreshed");
      break;

    case "verify":
      console.log("🔍 Verifying vector DB...");

      const tests = [
        { query: "quiero reservar", expected: "booking:create" },
        { query: "ver el menú", expected: "restaurant:view_menu" },
        { query: "cuánto cuesta", expected: "info:ask_price" },
      ];

      let passed = 0;
      for (const test of tests) {
        const { points } = await ragService.searchIntent(test.query, [
          "booking",
          "restaurant",
          "informational",
        ]);

        const detected = points[0].payload?.intent;
        if (detected === test.expected) {
          console.log(`✅ "${test.query}" → ${detected}`);
          passed++;
        } else {
          console.log(
            `❌ "${test.query}" → ${detected} (expected ${test.expected})`,
          );
        }
      }

      if (passed === tests.length) {
        console.log(`\n✅ All ${tests.length} tests passed`);
      } else {
        console.log(`\n❌ ${passed}/${tests.length} tests passed`);
        process.exit(1);
      }
      break;

    default:
      console.error(`❌ Invalid option: ${target}`);
      process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
