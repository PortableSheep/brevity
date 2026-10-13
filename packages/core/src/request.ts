import type { IncomingMessage } from "node:http";
import { validateRules, type ValidationRules, type ValidationResult } from "./validation.js";
import { HttpError } from "./http-error.js";

export class Request {
  public readonly method: string;
  public readonly headers: IncomingMessage["headers"];
  public readonly url: string;
  public readonly path: string;
  public readonly query: Record<string, string>;
  public readonly params: Record<string, string>;
  public body: Record<string, unknown> | null = null;
  public form: URLSearchParams | null = null;

  constructor(
    public readonly raw: IncomingMessage,
    routeParams: Record<string, string> = {},
  ) {
    this.method = raw.method ?? "GET";
    this.headers = raw.headers ?? {};
    this.url = raw.url ?? "/";
    const parsed = new URL(this.url, "http://localhost");
    this.path = parsed.pathname;
    this.query = Object.fromEntries(parsed.searchParams.entries());
    this.params = routeParams;
  }

  get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    if (this.body && Object.prototype.hasOwnProperty.call(this.body, key)) {
      return this.body[key] as T;
    }
    if (Object.prototype.hasOwnProperty.call(this.query, key)) {
      return this.query[key] as T;
    }
    return defaultValue;
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== null && value !== "";
  }

  param<T = string>(key: string, defaultValue: T | null = null): T | null {
    return (this.params[key] as T) ?? defaultValue;
  }

  async parseBody(maxBodyBytes = 1024 * 1024): Promise<Record<string, unknown>> {
    if (this.body !== null) return this.body;
    if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 0) {
      throw new RangeError("maxBodyBytes must be a non-negative safe integer");
    }
    const length = this.headers["content-length"];
    if (length !== undefined && Number(length) > maxBodyBytes) {
      throw new HttpError(413, "Payload Too Large");
    }
    const chunks: Buffer[] = [];
    let size = 0;
    // Keep the socket writable when rejecting a chunked upload.
    try {
      for await (const chunk of this.raw.iterator({ destroyOnReturn: false })) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > maxBodyBytes) throw new HttpError(413, "Payload Too Large");
        chunks.push(buffer);
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (this.raw.aborted || this.raw.destroyed) throw new HttpError(400, "Request Aborted");
      throw error;
    }
    if (!size) {
      this.body = {};
      return this.body;
    }
    const encoding = this.headers["content-encoding"];
    if (encoding && encoding.toLowerCase() !== "identity") {
      throw new HttpError(415, "Unsupported Content Encoding");
    }
    let raw: string;
    try {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size));
    } catch {
      throw new HttpError(400, "Invalid UTF-8 Body");
    }
    const ct = String(this.headers["content-type"] ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (ct === "application/json" || /^application\/[\w.+-]+\+json$/.test(ct)) {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        throw new HttpError(400, "Invalid JSON Body");
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new HttpError(400, "JSON Body Must Be an Object");
      }
      this.body = value as Record<string, unknown>;
      return this.body;
    }
    if (ct !== "application/x-www-form-urlencoded") {
      throw new HttpError(415, "Unsupported Media Type");
    }
    try {
      decodeURIComponent(raw.replaceAll("+", " "));
    } catch {
      throw new HttpError(400, "Invalid Form Encoding");
    }
    this.form = new URLSearchParams(raw);
    this.body = Object.fromEntries(this.form.entries());
    return this.body;
  }

  validate(rules: ValidationRules): ValidationResult {
    return validateRules((field) => this.get(field), rules);
  }
}
