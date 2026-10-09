import { ServiceProvider } from "./provider.js";
import { AsyncLocalStorage } from "node:async_hooks";

export type BindingKey = string | symbol;
export type BindingFactory<T = unknown> = (container: Container) => T;

type Binding<T = unknown> = {
  factory: BindingFactory<T>;
  singleton: boolean;
};

type ProviderCtor = new () => ServiceProvider;

export class Container {
  #bindings = new Map<BindingKey, Binding>();
  #instances = new Map<BindingKey, unknown>();
  #providers = new Map<string, ServiceProvider>();
  #booted = false;
  #scope = new AsyncLocalStorage<ReadonlyMap<BindingKey, unknown>>();

  runScoped<T>(instances: ReadonlyMap<BindingKey, unknown>, callback: () => T): T {
    return this.#scope.run(instances, callback);
  }

  bind<T>(key: BindingKey, factory: BindingFactory<T>): void {
    this.#bindings.set(key, { factory, singleton: false });
  }

  singleton<T>(key: BindingKey, factory: BindingFactory<T>): void {
    this.#bindings.set(key, { factory, singleton: true });
  }

  instance<T>(key: BindingKey, value: T): void {
    this.#instances.set(key, value);
  }

  has(key: BindingKey): boolean {
    return this.#scope.getStore()?.has(key) === true || this.#bindings.has(key) || this.#instances.has(key);
  }

  get<T>(key: BindingKey): T {
    const scope = this.#scope.getStore();
    if (scope?.has(key)) return scope.get(key) as T;
    if (this.#instances.has(key)) return this.#instances.get(key) as T;
    const binding = this.#bindings.get(key);
    if (!binding) throw new Error(`Container binding not found: ${String(key)}`);
    const value = binding.factory(this) as T;
    if (binding.singleton) this.#instances.set(key, value);
    return value;
  }

  make<T>(key: BindingKey): T {
    const binding = this.#bindings.get(key);
    if (!binding) throw new Error(`Container binding not found: ${String(key)}`);
    return binding.factory(this) as T;
  }

  registerProvider(provider: ProviderCtor | ServiceProvider): ServiceProvider {
    const instance = typeof provider === "function" ? new provider() : provider;
    const name = instance.constructor.name;
    const existing = this.#providers.get(name);
    if (existing) return existing;
    instance.register(this);
    this.#providers.set(name, instance);
    if (this.#booted) {
      instance.boot(this);
    }
    return instance;
  }

  registerProviders(providers: Array<ProviderCtor | ServiceProvider>): void {
    for (const p of providers) this.registerProvider(p);
  }

  bootProviders(): void {
    if (this.#booted) return;
    for (const provider of this.#providers.values()) {
      provider.boot(this);
    }
    this.#booted = true;
  }
}
