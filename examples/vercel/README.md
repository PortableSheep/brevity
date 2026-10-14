# Brevity on Vercel

A synthetic deployment example: one Node function, HTML file views, a native
form, and CDN-served CSS. No database, accounts, secrets, or stored submissions.

From the repository root:

```sh
npm ci
npm run build:packages
node examples/vercel/build.mjs
vercel link --cwd examples/vercel
vercel deploy --prebuilt --cwd examples/vercel
node examples/vercel/check.mjs https://your-deployment-url
```

Choose a project dedicated to this example. A preview deployment is sufficient;
there is no need to replace another project's production deployment. Deployment
protection must allow requests from the verification client; do not disable
protection on an unrelated application.

The build uses Vercel's Build Output API v3 and Node 22. It bundles the local
framework into a function, copies HTML views into the function, serves CSS from
the static directory, and routes other paths unchanged to the function.
`shouldAddHelpers: false` preserves the unread request stream for Brevity's
bounded parser. No Vercel SDK or platform package is added to core.

The checker exercises repeated requests, JSON and repeated form fields,
malformed/oversized/unsupported bodies, no-JS form redirects, escaped output,
multiple cookies, binary responses, explicit HEAD, 404/409, and concurrent
request scope isolation. It does not establish database durability, real
authentication, performance under load, or cold-start latency.
