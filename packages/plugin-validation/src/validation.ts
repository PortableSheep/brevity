import { Plugin, Validator } from "@portablesheep/brevity";
import type { Container } from "@portablesheep/brevity";

export type ValidationPluginOptions = {
  key?: string;
};

export class ValidationPlugin extends Plugin {
  readonly name = "validation";
  readonly description = "Registers a shared validator service";

  constructor(private readonly options: ValidationPluginOptions = {}) {
    super();
  }

  register(container: Container): void {
    const key = this.options.key ?? "validator";
    container.singleton(key, () => new Validator());
  }
}
