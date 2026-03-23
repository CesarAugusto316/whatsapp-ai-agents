export interface ICacheAdapter {
  /**
   * @description Get reservation data by key
   * @param key reservation:businesID:customerPhone
   * @returns
   */
  getObj<D>(key: string): Promise<D | undefined>;

  getStr(key: string): Promise<string | undefined>;

  /**
   *
   * @param key
   * @param payload
   */
  save<D>(key: string, payload: D, exp?: number): Promise<void>;

  delete(key: string): Promise<void>;
}
