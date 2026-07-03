import { Plugin, Viewer } from "@brevity/core";
import type { Container } from "@brevity/core";

export type ViewerPluginOptions = {
  baseDir: string;
  key?: string;
};

export class ViewerPlugin extends Plugin {
  readonly name = "viewer";
  readonly description = "Registers the template viewer in the container";

  constructor(private readonly options: ViewerPluginOptions) {
    super();
  }

  register(container: Container): void {
    const key = this.options.key ?? "viewer";
    container.singleton(key, () => new Viewer(this.options.baseDir));
  }
}
