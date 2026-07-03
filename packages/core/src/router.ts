import type { IncomingMessage, ServerResponse } from "node:http";
import type { Container } from "./container.js";
import { Request } from "./request.js";
import { Response } from "./response.js";

type RouteHandler = (req: Request, res: Response, container: Container | null) => unknown | Promise<unknown>;
type MiddlewareHandler = (
  req: Request,
  res: Response,
  next: (req: Request, res: Response) => Promise<unknown>,
  container: Container | null,
) => unknown | Promise<unknown>;
type ComposedHandler = (req: Request, res: Response) => Promise<unknown>;

type Route = {
  method: string;
  path: string;
  handler: RouteHandler;
  regex: RegExp;
  keys: string[];
};

export class Router {
  #routes: Route[] = [];
  #middleware: MiddlewareHandler[] = [];
  #notFound: RouteHandler = (_req, res) => res.status(404).json({ error: "Not Found" });
  #container: Container | null = null;

  setContainer(container: Container): void {
    this.#container = container;
  }

  middleware(fn: MiddlewareHandler): void {
    this.#middleware.push(fn);
  }

  clearMiddleware(): void {
    this.#middleware = [];
  }

  setNotFound(fn: RouteHandler): void {
    this.#notFound = fn;
  }

  get(path: string, handler: RouteHandler): void { this.#routes.push(makeRoute("GET", path, handler)); }
  post(path: string, handler: RouteHandler): void { this.#routes.push(makeRoute("POST", path, handler)); }
  put(path: string, handler: RouteHandler): void { this.#routes.push(makeRoute("PUT", path, handler)); }
  delete(path: string, handler: RouteHandler): void { this.#routes.push(makeRoute("DELETE", path, handler)); }

  async dispatch(nodeReq: IncomingMessage, nodeRes: ServerResponse): Promise<void> {
    const method = nodeReq.method ?? "GET";
    const pathname = new URL(nodeReq.url ?? "/", "http://localhost").pathname;
    let matched: Route | null = null;
    let params: Record<string, string> = {};

    for (const route of this.#routes) {
      if (route.method !== method) continue;
      const m = pathname.match(route.regex);
      if (!m) continue;
      matched = route;
      params = {};
      route.keys.forEach((k, i) => { params[k] = m[i + 1] ?? ""; });
      break;
    }

    const req = new Request(nodeReq, params);
    const res = new Response(nodeRes);

    if (this.#container) {
      this.#container.instance("request", req);
      this.#container.instance("response", res);
      this.#container.bootProviders();
    }

    if (method !== "GET" && method !== "HEAD") {
      await req.parseBody();
    }

    const endpoint: ComposedHandler = async (r: Request, s: Response): Promise<unknown> => {
      if (!matched) return this.#notFound(r, s, this.#container);
      return matched.handler(r, s, this.#container);
    };

    const chain: ComposedHandler = this.#middleware.reduceRight<ComposedHandler>(
      (next, mw) => async (r: Request, s: Response) => Promise.resolve(mw(r, s, next, this.#container)),
      endpoint,
    );

    try {
      await chain(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Internal Server Error", detail: message });
    }
  }
}

function makeRoute(method: string, path: string, handler: RouteHandler): Route {
  const { regex, keys } = compilePath(path);
  return { method, path, handler, regex, keys };
}

function compilePath(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const regexStr = path
    .replace(/\//g, "\\/")
    .replace(/\{i:([^}]+)\}/g, (_m, key: string) => {
      keys.push(key);
      return "([0-9]+)";
    })
    .replace(/\{s:([^}]+)\}/g, (_m, key: string) => {
      keys.push(key);
      return "([A-Za-z0-9]+)";
    })
    .replace(/\{\*:([^}]+)\}/g, (_m, key: string) => {
      keys.push(key);
      return "(.+)";
    })
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_m, key: string) => {
      keys.push(key);
      return "([^/]+)";
    });

  return { regex: new RegExp(`^${regexStr}$`), keys };
}
