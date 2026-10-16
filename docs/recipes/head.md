# Register HEAD explicitly

A GET route doesn't automatically handle HEAD or OPTIONS. Register HEAD when
you want clients to fetch the headers without the body.

<<< @/samples/routes.ts#plain-routes

The plain route uses `router.head`; the controller uses `@Head`.
Both apply the same parameter validation and content type as GET while sending
an empty body. Keep authorization, existence checks, cache headers, and other
representation headers equivalent in your real routes. HEAD should not perform
a write. If you send Content-Length, describe the GET representation, not the
empty HEAD body.

The first-route test deliberately expects HEAD to return 404; the explicit
routes expect 200 and an empty body. `staticAssets` is a separate web helper that
does handle GET **and** HEAD for its own exact asset map. That behavior does not
alias application routes.
