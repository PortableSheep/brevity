import type { ServerResponse } from "node:http";

export class Response {
  #statusCode = 200;

  constructor(public readonly raw: ServerResponse) {}

  status(code: number): this {
    this.#statusCode = code;
    return this;
  }

  header(name: string, value: string): this {
    this.raw.setHeader(name, value);
    return this;
  }

  json(payload: unknown, code = this.#statusCode): void {
    this.raw.statusCode = code;
    this.raw.setHeader("content-type", "application/json; charset=utf-8");
    this.raw.end(JSON.stringify(payload));
  }

  send(content: unknown, code = this.#statusCode): void {
    this.raw.statusCode = code;
    if (!this.raw.getHeader("content-type")) {
      this.raw.setHeader("content-type", "text/html; charset=utf-8");
    }
    this.raw.end(String(content ?? ""));
  }

  redirect(url: string, code = 302): void {
    this.raw.statusCode = code;
    this.raw.setHeader("location", url);
    this.raw.end("");
  }
}
