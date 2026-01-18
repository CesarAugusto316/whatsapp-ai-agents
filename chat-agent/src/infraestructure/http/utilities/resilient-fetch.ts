import { resilientCall, ResilientCallOptions } from "@/application/patterns";
import { fetch } from "bun";

// fetch resiliente con la misma firma + opciones extras
export async function resilientFetch(
  input: string | URL | Request,
  init?: RequestInit,
  options = {
    builtIn: "api",
    timeoutMs: 50_000,
    retryConfig: {
      maxAttempts: 3,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  } satisfies ResilientCallOptions,
): Promise<Response> {
  return resilientCall(() => fetch(input, init), options);
}
