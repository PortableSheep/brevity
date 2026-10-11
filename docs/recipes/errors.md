# Map domain errors to `HttpError`

**Tested:** local @brevity/core 0.1.0, Node.js 22.
Keep business errors independent of HTTP, then translate at the route boundary.

<<< @/samples/routes.ts

`requireId()` throws the application's `InputError`. `toHttpId()` translates
only that known error to 422 and rethrows everything else.
Do not use a broad catch that reports every database/programming failure as
bad input. Keep unexpected errors visible to core's server-side logging and
generic 500 response.

Use 404 for an absent resource, 409 for a known conflict, and 422 for domain
input that is syntactically acceptable but invalid. These mappings are your
policy, not inferred by Brevity. For retained HTML field errors, the
[tutorial](/guide/tutorial) renders an explicit 422 page instead of throwing.

Only 4xx `HttpError` messages are public in the default handler. Do not put
secrets, SQL, tokens, or personal information in those messages. An `onError`
hook can render your own response; it must also avoid leaking unexpected errors.
