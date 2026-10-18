import { createApp, HttpError, type Request, type Response } from "@portablesheep/brevity";
import { html, renderPage } from "@portablesheep/brevity-web";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

export type AuthConfig = {
  origin: string;
  supabaseUrl: string;
  publishableKey: string;
  fetch?: typeof fetch;
};

export function authApp(config: AuthConfig) {
  const origin = new URL(config.origin);
  if (origin.origin !== config.origin || !["https:", "http:"].includes(origin.protocol)) {
    throw new Error("Configure an exact HTTP(S) public origin, without a trailing slash");
  }
  if (origin.protocol === "http:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) {
    throw new Error("Use HTTPS outside local development");
  }
  const secure = origin.protocol === "https:";
  const cookieName = secure ? "__Host-brevity-auth" : "brevity-auth";

  function client(req: Request, res: Response) {
    const cookies = new Map(
      Object.entries(parse(req.headers.cookie ?? "")).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    return createServerClient(config.supabaseUrl, config.publishableKey, {
      cookieOptions: { name: cookieName, path: "/", sameSite: "lax", httpOnly: true, secure },
      global: config.fetch ? { fetch: config.fetch } : undefined,
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll(updates) {
          const existing = res.raw.getHeader("set-cookie");
          const headers =
            existing === undefined ? [] : Array.isArray(existing) ? existing : [String(existing)];
          for (const { name, value, options } of updates) {
            cookies.set(name, value);
            headers.push(
              serialize(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                httpOnly: true,
                secure,
              }),
            );
          }
          res.raw.setHeader("set-cookie", headers);
        },
      },
    });
  }

  const app = createApp({ maxBodyBytes: 4096 });
  app.use(async (req, res, next) => {
    res.header("referrer-policy", "same-origin");
    res.header("cache-control", "private, no-store");
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      req.headers.origin !== config.origin
    ) {
      throw new HttpError(403, "Submit from this site");
    }
    return next(req, res);
  });
  app.router.get("/login", (_req, res) =>
    renderPage(
      res,
      () =>
        html` <!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <title>Sign in</title>
            </head>
            <body>
              <h1>Sign in</h1>
              <form method="post" action="/login">
                <label for="email">Email</label
                ><input id="email" name="email" type="email" required />
                <button>Send sign-in link</button>
              </form>
            </body>
          </html>`,
      {},
    ),
  );
  app.router.post("/login", async (req, res) => {
    const email = req.form?.get("email")?.trim();
    if (
      !email ||
      req.form?.getAll("email").length !== 1 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new HttpError(422, "Enter one valid email address");
    }
    const supabase = client(req, res);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${config.origin}/auth/callback` },
    });
    if (error) {
      if (error.status === 429) throw new HttpError(429, "Wait before requesting another link");
      console.error("[auth] email request failed", error.code);
      throw new HttpError(502, "Could not send a sign-in link");
    }
    res.send("Check your email. Open the link in this browser.");
  });
  app.router.get("/auth/callback", async (req, res) => {
    const codes = new URL(req.url, config.origin).searchParams.getAll("code");
    const cookies = parse(req.headers.cookie ?? "");
    const hasVerifier = Object.keys(cookies).some(
      (name) =>
        name === `${cookieName}-code-verifier` || name.startsWith(`${cookieName}-code-verifier.`),
    );
    if (codes.length !== 1 || !codes[0] || !hasVerifier) {
      throw new HttpError(400, "Open the newest link in the browser that requested it");
    }
    const { error } = await client(req, res).auth.exchangeCodeForSession(codes[0]);
    if (error) {
      console.error("[auth] code exchange failed", error.code);
      throw new HttpError(400, "This sign-in link is invalid or expired; request a new one");
    }
    res.redirect("/account", 303);
  });
  app.router.get("/account", async (req, res) => {
    // getUser validates with Auth and refreshes when needed; getSession alone is not authorization.
    const { data, error } = await client(req, res).auth.getUser();
    if (error && (!error.status || error.status >= 500)) {
      console.error("[auth] verification failed", error.code);
      throw new HttpError(502, "Identity provider unavailable");
    }
    if (error || !data.user) throw new HttpError(401, "Sign in first");
    renderPage(
      res,
      () =>
        html`<!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <title>Account</title>
            </head>
            <body>
              <h1>Account</h1>
              <p>${data.user.email}</p>
              <form method="post" action="/logout"><button>Sign out</button></form>
            </body>
          </html>`,
      {},
    );
  });
  app.router.post("/logout", async (req, res) => {
    const { error } = await client(req, res).auth.signOut({ scope: "local" });
    if (error) {
      console.error("[auth] logout failed", error.code);
      throw new HttpError(502, "Could not sign out");
    }
    res.redirect("/login", 303);
  });
  return app;
}
