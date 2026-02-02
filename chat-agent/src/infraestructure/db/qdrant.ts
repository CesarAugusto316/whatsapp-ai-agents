// https://qdrant.tech/documentation/quickstart/
import { QdrantClient } from "@qdrant/js-client-rest";

export const vectorDB = new QdrantClient({ host: "localhost", port: 6333 });

// vectorDB.getCollections()

/**
 *
 * @link https://ollama.com/library/qwen3-embedding:0.6b
 */
await vectorDB.createCollection("business_knowledge", {
  vectors: {
    size: 1024, // qwen3-embedding
    distance: "Cosine",
  },
});

await vectorDB.createCollection("products_knowledge", {
  vectors: {
    size: 1024, // qwen3-embedding
    distance: "Cosine",
  },
});
