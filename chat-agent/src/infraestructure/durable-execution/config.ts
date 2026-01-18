import { DBOS } from "@dbos-inc/dbos-sdk";
import { env } from "bun";
import { logger } from "../logging";

export async function durableExecution() {
  DBOS.setConfig({
    name: "chat-agent",
    adminPort: Number(env?.DBOS_PORT) || 3002,
    systemDatabaseUrl: env?.DBOS_SYSTEM_DATABASE_URL,
    applicationVersion: "0.0.1",
  });

  try {
    /**
     *
     * @description launch dbos and connects to dbos console
     * @link https://console.dbos.dev/conductor/applications/chat-agent/workflows
     */
    await DBOS.launch({ conductorKey: env.DBOS_CONDUCTOR_KEY });
  } catch (error) {
    logger.error("Error launching DBOS", error as Error);
  }
}
