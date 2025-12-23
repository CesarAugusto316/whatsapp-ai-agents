import { ReserveProcess } from "@/agents/prompts";
import { redis } from "@/storage/storage.config";

const EXPIRATION_TIME = 60 * 60 * 1; // 1 hora

class ReservationService {
  /**
   * @description Get reservation data by key
   * @param key reservation:businesID:customerPhone
   * @returns
   */
  async get(key: string): Promise<Partial<ReserveProcess> | null> {
    const payload = await redis.get(key);
    if (!payload) return null;
    return JSON.parse(payload) satisfies Partial<ReserveProcess>;
  }

  /**
   *
   * @param key
   * @param payload
   */
  async save(key: string, payload: Partial<ReserveProcess>) {
    await redis.set(key, JSON.stringify(payload));
    await redis.expire(key, EXPIRATION_TIME);
  }

  async delete(key: string) {
    await redis.del(key);
  }
}

export default new ReservationService();
