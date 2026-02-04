import { ICacheAdapter } from "./cache.adapter.interface";
import { redisClient } from "./redis.client";

class CacheAdapter implements ICacheAdapter {
  private EXPIRATION_TIME = 60 * 60 * 2; // 2 horas

  /**
   * @description Get reservation data by key
   * @param key reservation:businesID:customerPhone
   * @returns
   */
  async getObj<D>(key: string): Promise<D | undefined> {
    const payload = await redisClient.get(key);
    if (!payload) return;
    return JSON.parse(payload) satisfies Partial<D>;
  }

  async getStr(key: string): Promise<string | undefined> {
    const payload = await redisClient.get(key);
    if (!payload) return;
    return payload;
  }

  /**
   *
   * @param key
   * @param payload
   */
  async save<D>(key: string, payload: D, exp?: number) {
    await redisClient.set(key, JSON.stringify(payload));
    await redisClient.expire(key, exp ?? this.EXPIRATION_TIME);
  }

  async delete(key: string) {
    await redisClient.del(key);
  }
}

export default new CacheAdapter();
