// ConfKeyValueStorage.ts
import Conf from 'conf';
import type { IKeyValueStorage } from '@walletconnect/keyvaluestorage';

export class ConfKeyValueStorage implements IKeyValueStorage {
  private store: Conf<Record<string, unknown>>;

  constructor(configName = 'walletkit', projectName = 'solana-wc') {
    this.store = new Conf<Record<string, unknown>>({
      projectName,
      configName,
      accessPropertiesByDotNotation: false,
    });
  }

  async getKeys(): Promise<string[]> {
    return Object.keys(this.store.store);
  }

  async getEntries<T = unknown>(): Promise<[string, T][]> {
    return Object.entries(this.store.store) as [string, T][];
  }

  async getItem<T = unknown>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }

  async setItem<T = unknown>(key: string, value: T): Promise<void> {
    if (value === undefined) {
      this.store.delete(key);
      return;
    }
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}