import { redis } from "@/storage/cache-storage.config";
import { ReservationState } from "@/workflow-fsm/resolve-next-state";

const EXPIRATION_TIME = 60 * 60 * 1; // 1 hora

class ReservationCacheService {
  /**
   * @description Get reservation data by key
   * @param key reservation:businesID:customerPhone
   * @returns
   */
  async get(key: string): Promise<Partial<ReservationState> | undefined> {
    const payload = await redis.get(key);
    if (!payload) return;
    return JSON.parse(payload) satisfies Partial<ReservationState>;
  }

  /**
   *
   * @param key
   * @param payload
   */
  async save(key: string, payload: Partial<ReservationState>) {
    await redis.set(key, JSON.stringify(payload));
    await redis.expire(key, EXPIRATION_TIME);
  }

  async delete(key: string) {
    await redis.del(key);
  }
}

export default new ReservationCacheService();
