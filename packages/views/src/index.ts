import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { Eta } from "eta";
import type { Response } from "@portablesheep/brevity";
import { createFormState, escapeHtml, HtmlFragment, trustedHtml } from "@portablesheep/brevity-web";

export type ViewData = Readonly<Record<string, unknown>>;

export type CompiledView = (data: ViewData) => string | Promise<string>;

export interface ViewEngine {
  compile(source: string, filename: string): CompiledView | Promise<CompiledView>;
}

export type ViewOptions = { status?: number; layout?: string | false };

export type ViewsOptions = {
  root: string;
  extension?: string;
  cache?: boolean;
  layout?: string;
  engine?: ViewEngine;
  helpers?: ViewData;
};

/** Eta syntax, async partials, and escaped interpolation; templates are trusted code. */
export function etaEngine(): ViewEngine {
  const eta = new Eta({
    autoEscape: true,
    autoTrim: false,
    escapeFunction: (value: unknown) =>
      value instanceof HtmlFragment ? value.toString() : escapeHtml(String(value ?? "")),
  });
  return {
    compile(source) {
      const compiled = eta.compile(source, { async: true });
      return async (data) => compiled.call(eta, data);
    },
  };
}

export function createViews(options: ViewsOptions) {
  const root = resolve(options.root);
  const extension = options.extension ?? ".html";
  if (!/^\.[a-zA-Z0-9]+$/.test(extension)) throw new TypeError("Invalid view extension");
  const engine = options.engine ?? etaEngine();
  const cache = options.cache ?? process.env.NODE_ENV === "production";
  const compiled = new Map<string, Promise<CompiledView>>();
  const helpers = { createFormState, ...options.helpers };

  function filename(name: string): string {
    if (
      !name ||
      name.includes("\\") ||
      name.includes("%") ||
      name.includes("\0") ||
      isAbsolute(name) ||
      name.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new TypeError(`Invalid view name: ${name}`);
    }
    return resolve(root, name.endsWith(extension) ? name : name + extension);
  }

  async function load(file: string): Promise<CompiledView> {
    const [actualRoot, actualFile] = await Promise.all([realpath(root), realpath(file)]);
    const path = relative(actualRoot, actualFile);
    if (!path || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)) {
      throw new TypeError("View resolves outside its root");
    }
    return engine.compile(await readFile(actualFile, "utf8"), actualFile);
  }

  function get(file: string): Promise<CompiledView> {
    if (!cache) return load(file);
    let result = compiled.get(file);
    if (!result) {
      result = load(file);
      compiled.set(file, result);
      const pending = result;
      void result.catch(() => {
        if (compiled.get(file) === pending) compiled.delete(file);
      });
    }
    return result;
  }

  async function template(
    name: string,
    data: ViewData,
    ancestors: readonly string[] = [],
  ): Promise<HtmlFragment> {
    const file = filename(name);
    if (ancestors.includes(file) || ancestors.length >= 64)
      throw new Error("Recursive view partial");
    const render = await get(file);
    const partial = (child: string, locals: ViewData = {}) =>
      template(child, { ...data, ...locals }, [...ancestors, file]);
    const output = await render({ ...helpers, ...data, partial });
    if (typeof output !== "string") throw new TypeError("View engine must render a string");
    return trustedHtml(output);
  }

  async function renderToString(
    name: string,
    data: ViewData = {},
    settings: ViewOptions = {},
  ): Promise<HtmlFragment> {
    const body = await template(name, data);
    const layout = settings.layout === false ? undefined : (settings.layout ?? options.layout);
    return layout ? template(layout, { ...data, body }) : body;
  }

  return {
    renderToString,
    async render(
      res: Response,
      name: string,
      data: ViewData = {},
      settings: ViewOptions = {},
    ): Promise<void> {
      const page = await renderToString(name, data, settings);
      res.header("content-type", "text/html; charset=utf-8");
      res.header("x-content-type-options", "nosniff");
      res.send(page.toString(), settings.status ?? 200);
    },
    clearCache() {
      compiled.clear();
    },
  };
}
