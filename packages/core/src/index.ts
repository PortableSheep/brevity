import { createServer, type Server } from "node:http";
import { Router } from "./router.js";
import { Container } from "./container.js";
import { ServiceProvider } from "./provider.js";
import { Request } from "./request.js";
import { Response } from "./response.js";
import { Viewer } from "./viewer.js";
import { Plugin, resolvePlugin, type PluginLike } from "./plugin.js";
import { Validator } from "./validation.js";

export { Router, Container, ServiceProvider, Request, Response, Viewer, Validator, Plugin };
export type { PluginLike };

export type App = {
  router: Router;
  container: Container;
  plugins: string[];
  use: (mw: Parameters<Router["middleware"]>[0]) => void;
  usePlugin: (plugin: PluginLike) => Plugin;
  usePlugins: (plugins: PluginLike[]) => Plugin[];
  listen: (port?: number, host?: string) => Server;
};

export type CreateAppOptions = {
  plugins?: PluginLike[];
};

export function createApp(options: CreateAppOptions = {}): App {
  const router = new Router();
  const container = new Container();
  const plugins: string[] = [];
  router.setContainer(container);

  const app: App = {
    router,
    container,
    plugins,
    use: (mw) => router.middleware(mw),
    usePlugin(plugin) {
      const instance = resolvePlugin(plugin);
      container.registerProvider(instance);
      plugins.push(instance.name);
      return instance;
    },
    usePlugins(list) {
      return list.map((plugin) => app.usePlugin(plugin));
    },
    listen(port = 3000, host = "127.0.0.1") {
      const server = createServer((req, res) => {
        void router.dispatch(req, res);
      });
      server.listen(port, host);
      return server;
    },
  };

  if (options.plugins?.length) {
    app.usePlugins(options.plugins);
  }

  return app;
}
