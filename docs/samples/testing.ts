import assert from "node:assert/strict";
import { once } from "node:events";
import type { TestContext } from "node:test";
import type { App } from "@brevity/core";

export async function serve(t: TestContext, app: App): Promise<string> {
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}
