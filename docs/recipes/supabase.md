# Supabase server-side passwordless PKCE

**Tested SDKs:** @supabase/ssr 0.7.0, @supabase/supabase-js 2.57.4,
cookie 1.0.2, Node.js 22. Automated tests exercise real SDK code against a
stubbed Auth endpoint; **they do not send email or prove live refresh**.

## Provider setup

Use a Supabase project's publishable/anon key, never a service-role key.
Enable email passwordless sign-in. Configure the Site URL to your canonical
app origin, and allowlist the exact `/auth/callback` redirect URL.
The default magic-link email should use the provider's `ConfirmationURL`,
so Auth verifies the email link and redirects with a **code**. Do not replace
it with a token-hash callback without implementing that different flow.

For local development, use `http://127.0.0.1:3000` consistently, not a mix of
localhost and IP origins. For production, use a fixed HTTPS origin, validate
Host at your proxy, and do not derive trusted redirects from request headers.
Use custom SMTP for real users; configure deliverability and redirect allowlists
in Supabase, not in Brevity.

## Request-local client and cookies

<<< @/samples/supabase.ts

This app creates a new SDK client per handler. `getAll` reads the requesting
browser's cookie jar; `setAll` supports chunked cookies and appends **multiple
Set-Cookie headers** through `res.raw`. Do not collapse them into a comma-delimited
string. The SDK persists the verifier when requesting an email and updates/clears
session cookies when exchanging, refreshing, or signing out.

Cookies are HttpOnly, Path `/`, SameSite Lax, and Secure on HTTPS. The HTTPS
cookie name uses `__Host-` (no Domain attribute). This is a **server-only** auth
recipe: do not also expect a browser Supabase SDK to read its HttpOnly cookies.
Do not share one SDK client across users or cache authenticated responses.

## Why browser binding matters

PKCE stores a verifier in the initiating browser's cookie jar and sends only
its challenge to Auth. The email link returns a code; exchanging it also requires
that verifier. Forwarding a link to another browser should fail, not silently
create a session. We reject a missing verifier before exchange; the Auth server
still performs the cryptographic check. Requesting another link can replace the
verifier, so open the **newest link in the same browser**.

The callback has no user-controlled redirect target. An invalid/expired code
gets a visible 400 and instructions to request a new link. Code and tokens never
go in application logs. A GET callback is required for email navigation; all
application mutations, including logout, are POSTs.

## Origin checks and Referrer-Policy

The middleware requires the configured exact Origin for mutation requests,
including login/logout, and rejects missing Origin. It sends
**`Referrer-Policy: same-origin`**: do not substitute `no-referrer` blindly, since
browser form submissions can lose the Origin needed by this policy.
SameSite cookies alone are not the application's CSRF policy.
If supporting non-browser clients, design an explicit separate authentication
and CSRF contract rather than weakening the form routes.

## Session verification, refresh, and logout

`getUser()` verifies identity with Auth; `getSession()` alone is not authorization.
The SSR client refreshes expired sessions when required and writes new cookies
before the response is sent. `getUser` failures distinguish unauthenticated users
from unavailable upstream services. The app must still enforce resource ownership,
RLS, and permissions using the verified user's ID.

Logout uses local scope and clears this browser's session. Revoking refresh
tokens does not instantly revoke every already-issued JWT; design sensitive
operations and session policy accordingly.

## Run it

<<< @/samples/supabase-start.ts

Set `APP_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in your shell or
deployment secret manager, then run from the repository root:

```sh
node --import tsx docs/samples/supabase-start.ts
```

The entry point fails explicitly if configuration is missing. Environment
files are not loaded automatically; Node's `--env-file` is an option if needed.
Visit `/login`, not `/`.

## Email rate limits are part of the UX

[Supabase's rate-limit documentation](https://supabase.com/docs/guides/auth/rate-limits)
currently describes a built-in sender limit of **2 emails per hour per project**
and a default **60-second window per user** for OTP/magic-link requests.
Check your actual project settings; custom SMTP can change limits.
The recipe returns 429 visibly instead of reporting “email sent.”

Add an application/edge abuse limit and appropriate bot protection before
public deployment. This recipe does not implement a durable multi-instance
rate limiter. Avoid retry loops, email enumeration, and logging email/code/token
payloads. A single-browser demo is not an auth engine.

## Acceptance checklist for your environment

1. Submit the native login form; confirm delivery and HttpOnly verifier cookies.
2. Open the link in another browser: expect a controlled failure and no session.
3. Open the newest link in the original browser: expect account page and session cookies.
4. Use a short local JWT lifetime, wait for expiry, reload `/account`, and confirm
   token refresh plus updated cookies and verified identity.
5. Reject missing/cross-site Origin on login/logout; sign out and confirm account is 401.
6. Exercise expired/reused links, SMTP failure, 429, and resource ownership checks.

`npm run docs:check` covers PKCE challenge/verifier wiring, cookie attributes,
wrong-browser rejection, expiry failure, Origin rejection, and surfaced 429.
Run the live checklist separately against local Supabase/Mailpit or your staging
project; no hosted provider credentials belong in CI for the framework docs.
