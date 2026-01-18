import { redisClient } from "../cache/redis.client";

const EXPIRATION_TIME = 60 * 60 * 1; // 1 hora

class Cache {
  /**
   * @description Get reservation data by key
   * @param key reservation:businesID:customerPhone
   * @returns
   */
  async get<D>(key: string): Promise<Partial<D> | undefined> {
    const payload = await redisClient.get(key);
    if (!payload) return;
    return JSON.parse(payload) satisfies Partial<D>;
  }

  /**
   *
   * @param key
   * @param payload
   */
  async save<D>(key: string, payload: Partial<D>) {
    await redisClient.set(key, JSON.stringify(payload));
    await redisClient.expire(key, EXPIRATION_TIME);
  }

  async delete(key: string) {
    await redisClient.del(key);
  }
}

export default new Cache();
