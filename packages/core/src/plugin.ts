import { ServiceProvider } from "./provider.js";

export abstract class Plugin extends ServiceProvider {
  abstract readonly name: string;
  readonly version: string = "0.1.0";
  readonly description: string = "";
}

export type PluginCtor<T extends Plugin = Plugin> = new (...args: never[]) => T;
export type PluginLike<T extends Plugin = Plugin> = T | PluginCtor<T>;

export function resolvePlugin<T extends Plugin>(plugin: PluginLike<T>): T {
  return typeof plugin === "function" ? new plugin() : plugin;
}
