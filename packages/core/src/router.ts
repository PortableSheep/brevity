import type { IncomingMessage, ServerResponse } from "node:http";
import type { Container } from "./container.js";
import { Request } from "./request.js";
import { Response } from "./response.js";
import { HttpError } from "./http-error.js";

export type RouteHandler = (
  req: Request,
  res: Response,
  container: Container | null,
) => unknown | Promise<unknown>;
export type MiddlewareHandler = (
  req: Request,
  res: Response,
  next: (req: Request, res: Response) => Promise<unknown>,
  container: Container | null,
) => unknown | Promise<unknown>;
type ComposedHandler = (req: Request, res: Response) => Promise<unknown>;
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type RouterOptions = {
  maxBodyBytes?: number;
  parseBody?: boolean;
  onError?: (error: unknown, req: Request | null, res: Response) => unknown | Promise<unknown>;
};

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
  #maxBodyBytes: number;

  constructor(private readonly config: RouterOptions = {}) {
    this.#maxBodyBytes = config.maxBodyBytes ?? 1024 * 1024;
    if (!Number.isSafeInteger(this.#maxBodyBytes) || this.#maxBodyBytes < 0) {
      throw new RangeError("maxBodyBytes must be a non-negative safe integer");
    }
  }

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

  route(method: HttpMethod, path: string, handler: RouteHandler): void {
    this.#routes.push(makeRoute(method, path, handler));
  }

  get(path: string, handler: RouteHandler): void {
    this.route("GET", path, handler);
  }
  post(path: string, handler: RouteHandler): void {
    this.route("POST", path, handler);
  }
  put(path: string, handler: RouteHandler): void {
    this.route("PUT", path, handler);
  }
  patch(path: string, handler: RouteHandler): void {
    this.route("PATCH", path, handler);
  }
  delete(path: string, handler: RouteHandler): void {
    this.route("DELETE", path, handler);
  }
  head(path: string, handler: RouteHandler): void {
    this.route("HEAD", path, handler);
  }
  options(path: string, handler: RouteHandler): void {
    this.route("OPTIONS", path, handler);
  }

  async dispatch(nodeReq: IncomingMessage, nodeRes: ServerResponse): Promise<void> {
    let request: Request | null = null;
    const response = new Response(nodeRes);
    try {
      await this.#dispatch(nodeReq, response, (req) => {
        request = req;
      });
    } catch (error) {
      nodeReq.resume();
      await this.handleError(error, request, response);
    }
  }

  async handleError(error: unknown, req: Request | null, res: Response): Promise<void> {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error("[brevity] request failed", error);
    if (res.raw.destroyed || res.raw.writableEnded) return;
    if (res.raw.headersSent) {
      res.raw.destroy();
      return;
    }
    res.raw.shouldKeepAlive = false;
    if (this.config.onError) {
      try {
        await this.config.onError(error, req, res);
        if (res.raw.writableEnded || res.raw.headersSent || res.raw.destroyed) return;
      } catch (hookError) {
        console.error("[brevity] error handler failed", hookError);
        if (res.raw.headersSent) {
          res.raw.destroy();
          return;
        }
      }
    }
    const message =
      error instanceof HttpError && status < 500 ? error.message : "Internal Server Error";
    res.status(status).json({ error: message });
  }

  async #dispatch(
    nodeReq: IncomingMessage,
    res: Response,
    setRequest: (req: Request) => void,
  ): Promise<void> {
    const method = nodeReq.method ?? "GET";
    let pathname: string;
    try {
      pathname = new URL(nodeReq.url ?? "/", "http://localhost").pathname;
    } catch {
      throw new HttpError(400, "Invalid Request URL");
    }
    let matched: Route | null = null;
    let params: Record<string, string> = {};

    for (const route of this.#routes) {
      if (route.method !== method) continue;
      const m = pathname.match(route.regex);
      if (!m) continue;
      matched = route;
      params = {};
      try {
        route.keys.forEach((k, i) => {
          params[k] = decodeURIComponent(m[i + 1] ?? "");
        });
      } catch {
        throw new HttpError(400, "Invalid Route Encoding");
      }
      break;
    }

    const req = new Request(nodeReq, params);
    setRequest(req);

    const endpoint: ComposedHandler = async (r: Request, s: Response): Promise<unknown> => {
      if (!matched) return this.#notFound(r, s, this.#container);
      return matched.handler(r, s, this.#container);
    };

    const chain: ComposedHandler = this.#middleware.reduceRight<ComposedHandler>(
      (next, mw) => async (r: Request, s: Response) =>
        Promise.resolve(mw(r, s, next, this.#container)),
      endpoint,
    );

    const run = async () => {
      this.#container?.bootProviders();
      if (this.config.parseBody !== false && method !== "GET" && method !== "HEAD") {
        await req.parseBody(this.#maxBodyBytes);
      }
      await chain(req, res);
    };
    if (this.#container) {
      await this.#container.runScoped(
        new Map<string, unknown>([
          ["request", req],
          ["response", res],
        ]),
        run,
      );
    } else {
      await run();
    }
  }
}

function makeRoute(method: string, path: string, handler: RouteHandler): Route {
  const { regex, keys } = compilePath(path);
  return { method, path, handler, regex, keys };
}

function compilePath(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const token = /\{([is*]):([^}]+)\}|:([A-Za-z_][A-Za-z0-9_]*)/g;
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let source = "";
  let offset = 0;
  for (const match of path.matchAll(token)) {
    source += escape(path.slice(offset, match.index));
    keys.push(match[2] ?? match[3]);
    source +=
      match[1] === "i"
        ? "([0-9]+)"
        : match[1] === "s"
          ? "([A-Za-z0-9]+)"
          : match[1] === "*"
            ? "(.+)"
            : "([^/]+)";
    offset = match.index + match[0].length;
  }
  return { regex: new RegExp(`^${source}${escape(path.slice(offset))}$`), keys };
}
