import type { IncomingMessage } from "node:http";
import { validateRules, type ValidationRules, type ValidationResult } from "./validation.js";

export class Request {
  public readonly method: string;
  public readonly headers: IncomingMessage["headers"];
  public readonly url: string;
  public readonly path: string;
  public readonly query: Record<string, string>;
  public readonly params: Record<string, string>;
  public body: Record<string, unknown> | null = null;

  constructor(public readonly raw: IncomingMessage, routeParams: Record<string, string> = {}) {
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

  async parseBody(): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    for await (const chunk of this.raw) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) {
      this.body = {};
      return this.body;
    }

    const ct = String(this.headers["content-type"] ?? "").toLowerCase();
    if (ct.includes("application/json")) {
      this.body = JSON.parse(raw) as Record<string, unknown>;
      return this.body;
    }
    this.body = Object.fromEntries(new URLSearchParams(raw).entries());
    return this.body;
  }

  validate(rules: ValidationRules): ValidationResult {
    return validateRules((field) => this.get(field), rules);
  }
}
