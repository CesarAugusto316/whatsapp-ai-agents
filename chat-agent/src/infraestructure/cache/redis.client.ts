import { env, RedisClient } from "bun";
export const redisClient = new RedisClient(env.REDIS_URL);
