# Sign in with Supabase

Add passwordless email sign-in using Supabase's server-side SDK. The browser
submits a native form; your server handles cookies and verifies the user.

## Configure the provider

In your Supabase project:

1. Enable passwordless email sign-in.
2. Set the Site URL to your app's canonical origin and add its exact
   `/auth/callback` URL to Redirect URLs. Preserve entries used by other apps.
3. Keep the email template's `ConfirmationURL` link so the callback receives
   an authorization code.

Use the publishable/anon key, **never a service-role key**. For local work, use
`http://127.0.0.1:3000` consistently; don't mix it with `localhost`. Public apps
need a fixed HTTPS origin and SMTP configured for real users.

## Run the example

Set `APP_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in your shell or
secret manager. Don't put values in source control. Then, from the repository root:

```sh
npm run build:packages
node --import tsx docs/samples/supabase-start.ts
```

Open **http://127.0.0.1:3000/login**. Request a link and open the newest email in
**the same browser**. PKCE binds the link to that browser; forwarding it elsewhere
should fail.

::: details Entry point and environment checks
<<< @/samples/supabase-start.ts

Missing configuration fails at startup. Environment files aren't loaded
automatically; use Node's `--env-file` option if needed.
:::

## How the request flow works

The app creates an SDK client per handler. A login request saves a PKCE verifier
in an HttpOnly cookie. The email returns a code; the callback exchanges that code
using the verifier and writes session cookies. Protected handlers call `getUser()`
to verify identity, not just `getSession()`.

The SDK refreshes expired sessions and updates cookies before the response is
sent. Your app still checks resource ownership and permissions using the verified
user ID. Don't share one client across users or cache authenticated responses.

::: details Complete auth implementation
<<< @/samples/supabase.ts
:::

## Cookies and form security

Cookies are HttpOnly, Path `/`, SameSite Lax, and Secure on HTTPS. HTTPS names use
`__Host-` without a Domain attribute. The SDK supports chunked cookies; append
separate `Set-Cookie` headers rather than combining them with commas.

This is a server-only session: a browser Supabase SDK can't read these HttpOnly
cookies. Mutations, including login/logout, use POST and require the configured
exact Origin. Keep `Referrer-Policy: same-origin`; changing it to `no-referrer`
can remove the Origin needed by browser forms. Don't derive trusted redirects
from arbitrary Host/forwarded headers.

The callback accepts no user-controlled destination. Expired or invalid codes
produce a visible error, without logging codes or tokens. Asking for another link
can replace the verifier, so use the newest link.

Logout clears this browser's session using local scope. It doesn't instantly
revoke every already-issued JWT; account for that in sensitive operations.

## Handle email limits

Supabase's built-in sender has restrictive
[email rate limits](https://supabase.com/docs/guides/auth/rate-limits). Check the
project's current limits and configure SMTP before public use. This example
shows 429 as an error instead of pretending an email was sent.

Add rate limiting and bot protection for a public login form. Don't retry email
requests in a loop or log addresses, codes, or tokens.

## Check your setup

Try sign-in in the original browser and rejection in a different browser. Then
verify expired/reused links, logout, cross-site POST rejection, email failures,
and 429 handling. Test refresh with a short **local** token lifetime before
changing any hosted settings.

The [recipe tests](./#versions-and-checks) use Supabase SSR 0.7.0, JS 2.57.4, and
cookie 1.0.2 against stubbed Auth HTTP. They check PKCE, cookies, Origin, and
error handling, not email delivery or successful live refresh. Run the hosted
checks separately with your own provider configuration.
