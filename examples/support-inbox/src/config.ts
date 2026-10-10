import { randomBytes, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { InputError } from "./domain.js";

export const assets = fileURLToPath(new URL("../public/", import.meta.url));
export const bodyLimit = 16 * 1024;
export const headers = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "cache-control": "no-store",
};
export type Options = { file: string; token: string };
export function checkToken(input: Record<string, unknown>, token: string): void {
  const supplied = input._token;
  if (typeof supplied !== "string" || Buffer.byteLength(supplied) !== Buffer.byteLength(token)
    || !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) throw new InputError(403, "Invalid form token");
}
export function configuration(): Options & { port: number } {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid PORT");
  const file = process.env.SUPPORT_DATA ?? resolve("data/requests.json");
  const token = randomBytes(32).toString("hex");
  return { file, token, port };
}
