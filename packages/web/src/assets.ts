import { open } from "node:fs/promises";
import { validateHeaderValue } from "node:http";
import { extname } from "node:path";
import type { Router } from "@portablesheep/brevity";

type MiddlewareHandler = Parameters<Router["middleware"]>[0];

export type StaticAsset = {
  file: string;
  contentType?: string;
  cacheControl?: string;
};

const mimeTypes: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

export function staticAssets(assets: Readonly<Record<string, StaticAsset>>): MiddlewareHandler {
  const entries = new Map(
    Object.entries(assets).map(([url, asset]) => {
      if (
        !url.startsWith("/") ||
        url.startsWith("//") ||
        !/^[\x21-\x7e]+$/.test(url) ||
        /[?#%\\\s]/.test(url) ||
        new URL(url, "http://localhost").pathname !== url
      ) {
        throw new TypeError(
          `Static asset URL must be a canonical, unencoded absolute path: ${url}`,
        );
      }
      const contentType = asset.contentType ?? mimeTypes[extname(asset.file).toLowerCase()];
      if (!contentType) throw new TypeError(`Specify contentType for static asset: ${url}`);
      const cacheControl = asset.cacheControl ?? "no-cache";
      validateHeaderValue("content-type", contentType);
      validateHeaderValue("cache-control", cacheControl);
      return [url, { file: asset.file, contentType, cacheControl }] as const;
    }),
  );

  return async (req, res, next) => {
    const asset = entries.get(req.path);
    // Do not let URL normalization or encoded aliases expand the explicit allowlist.
    if (!asset || req.url.split("?")[0] !== req.path) return next(req, res);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.header("allow", "GET, HEAD");
      res.status(405).send("Method Not Allowed");
      return;
    }

    const file = await open(asset.file, "r");
    try {
      const stat = await file.stat();
      if (!stat.isFile()) throw new TypeError(`Static asset is not a regular file: ${asset.file}`);
      const body = req.method === "GET" ? await file.readFile() : null;
      res.header("content-type", asset.contentType);
      res.header("x-content-type-options", "nosniff");
      res.header("cache-control", asset.cacheControl);
      res.header("content-length", String(body?.byteLength ?? stat.size));
      res.raw.statusCode = 200;
      res.raw.end(body);
    } finally {
      await file.close();
    }
  };
}
