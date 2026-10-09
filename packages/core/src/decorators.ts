import type { HttpMethod, RouteHandler, Router } from "./router.js";

type RouteMetadata = { method: HttpMethod; path: string };
const prefixes = new WeakMap<Function, string>();
const routes = new WeakMap<Function, RouteMetadata[]>();

function checkPath(path: string): void {
  if (path !== "" && !path.startsWith("/")) {
    throw new Error(`Controller and route paths must be empty or start with "/": ${path}`);
  }
}

export function Controller(prefix = "") {
  checkPath(prefix);
  return <T extends abstract new (...args: never[]) => object>(
    value: T,
    _context: ClassDecoratorContext<T>,
  ): void => {
    prefixes.set(value, prefix);
  };
}

export function Route(method: HttpMethod, path = "") {
  checkPath(path);
  return (value: RouteHandler, context: ClassMethodDecoratorContext): void => {
    if (context.static || context.private) {
      throw new Error("Route decorators require public instance methods");
    }
    const metadata = routes.get(value) ?? [];
    metadata.push({ method, path });
    routes.set(value, metadata);
  };
}

export const Get = (path = "") => Route("GET", path);
export const Post = (path = "") => Route("POST", path);
export const Put = (path = "") => Route("PUT", path);
export const Patch = (path = "") => Route("PATCH", path);
export const Delete = (path = "") => Route("DELETE", path);
export const Head = (path = "") => Route("HEAD", path);
export const Options = (path = "") => Route("OPTIONS", path);

export function registerControllers(router: Router, ...controllers: object[]): void {
  const pending: Array<RouteMetadata & { handler: RouteHandler }> = [];
  for (const controller of controllers) {
    const prefix = prefixes.get(controller.constructor);
    if (prefix === undefined) {
      throw new Error(`Controller must have @Controller: ${controller.constructor.name}`);
    }
    const seen = new Set<string | symbol>();
    // Own members shadow inherited routes, including undecorated overrides.
    let prototype: object | null = controller;
    while (prototype && prototype !== Object.prototype) {
      for (const key of Reflect.ownKeys(prototype)) {
        if (seen.has(key)) continue;
        seen.add(key);
        const value: unknown = Object.getOwnPropertyDescriptor(prototype, key)?.value;
        if (typeof value !== "function") continue;
        for (const route of routes.get(value) ?? []) {
          const handler = value as RouteHandler;
          const path = `${prefix.replace(/\/+$/, "")}${route.path}` || "/";
          pending.push({
            method: route.method,
            path,
            handler: (req, res, container) => handler.call(controller, req, res, container),
          });
        }
      }
      prototype = Object.getPrototypeOf(prototype);
    }
  }
  for (const { method, path, handler } of pending) {
    router.route(method, path, handler);
  }
}
