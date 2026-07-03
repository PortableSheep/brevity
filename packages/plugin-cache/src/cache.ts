import { Plugin } from "@brevity/core";
import type { Container } from "@brevity/core";

export interface CacheAdapter {
  get<T = unknown>(key: string, defaultValue?: T | null): T | null;
  put<T = unknown>(key: string, value: T, ttl?: number): boolean;
  has(key: string): boolean;
  forget(key: string): boolean;
  clear(): boolean;
}

type CacheRecord = {
  value: unknown;
  expiresAt: number | null;
};

export class MemoryCacheAdapter implements CacheAdapter {
  #store = new Map<string, CacheRecord>();

  get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    const item = this.#store.get(key);
    if (!item) return defaultValue;
    if (item.expiresAt && Date.now() >= item.expiresAt) {
      this.#store.delete(key);
      return defaultValue;
    }
    return item.value as T;
  }

  put<T = unknown>(key: string, value: T, ttl = 0): boolean {
    const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
    this.#store.set(key, { value, expiresAt });
    return true;
  }

  has(key: string): boolean {
    return this.get(key, undefined as unknown as null) !== undefined;
  }

  forget(key: string): boolean {
    return this.#store.delete(key);
  }

  clear(): boolean {
    this.#store.clear();
    return true;
  }
}

export class NullCacheAdapter implements CacheAdapter {
  get<T = unknown>(_key: string, defaultValue: T | null = null): T | null { return defaultValue; }
  put<T = unknown>(_key: string, _value: T, _ttl = 0): boolean { return true; }
  has(_key: string): boolean { return false; }
  forget(_key: string): boolean { return true; }
  clear(): boolean { return true; }
}

export class CacheManager {
  constructor(
    public readonly adapter: CacheAdapter,
    private readonly defaultTtl = 300,
  ) {}

  get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    return this.adapter.get(key, defaultValue);
  }

  put<T = unknown>(key: string, value: T, ttl = 0): boolean {
    return this.adapter.put(key, value, ttl || this.defaultTtl);
  }

  has(key: string): boolean { return this.adapter.has(key); }
  forget(key: string): boolean { return this.adapter.forget(key); }
  clear(): boolean { return this.adapter.clear(); }

  remember<T = unknown>(key: string, resolver: () => T, ttl = 0): T {
    if (this.has(key)) return this.get<T>(key) as T;
    const value = resolver();
    this.put(key, value, ttl);
    return value;
  }
}

export type CachePluginOptions = {
  adapter?: CacheAdapter;
  defaultTtl?: number;
  key?: string;
};

export class CachePlugin extends Plugin {
  readonly name = "cache";
  readonly description = "Registers a cache manager in the container";

  constructor(private readonly options: CachePluginOptions = {}) {
    super();
  }

  register(container: Container): void {
    const key = this.options.key ?? "cache";
    const adapter = this.options.adapter ?? new MemoryCacheAdapter();
    const defaultTtl = this.options.defaultTtl ?? 300;
    container.singleton(key, () => new CacheManager(adapter, defaultTtl));
  }
}
