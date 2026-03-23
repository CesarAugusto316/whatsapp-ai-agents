let redisClient!: Record<string, CallableFunction>;

// Inicializa al inicio del worker
export async function initializeRedis() {
  if (!redisClient) {
    const { RedisClient } = await import("bun");
    // @ts-expect-error
    redisClient = new RedisClient(process.env.REDIS_URL);
    return redisClient;
  }
  return redisClient;
}
