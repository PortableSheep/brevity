# Brevity starter

A small file-template starter, not a production-readiness guarantee. The
framework's `npm run test:release` copies this starter into a temporary consumer,
installs packed packages, typechecks, builds, and checks both dev and compiled
HTTP startup.

## Quick start

Install from the configured npm registry once the Brevity packages are published,
or use local package tarballs during framework development.

```sh
npm install
npm run dev
```

Visit `http://127.0.0.1:3000`. For compiled startup:

```sh
npm run lint
npm run build
NODE_ENV=production npm start
```

`PORT` changes the port. The default binds loopback, not the public internet.
`SIGINT` and `SIGTERM` stop accepting requests and close idle connections.
See the framework's operations recipe for bounded draining and resource cleanup.

## Files and templates

Edit `src/index.ts` for routes and `views/index.html` for markup. Deploy the
`views/` directory alongside `dist/`; TypeScript does not copy it. The template
path works from both `src/` and `dist/`.

This starter uses the existing `Viewer` interpolation utility: `{{ title }}`
escapes a value; triple braces accept trusted raw markup. It does **not**
execute JavaScript loops in templates. For layouts, partials, and Eta logic,
use the checked `@brevity/views` notebook tutorial in the framework docs.

## Validation and optional plugins

Resolve container services with explicit types (`Validator` from `@brevity/core`,
`CacheManager` from `@brevity/plugin-cache`) rather than unchecked optional calls.
The cache uses `put`, not `set`, and is process-local, not durable storage.

Validator supports `required`, `email`, `int`, `slug`, `min:x`, and `max:x`.
Min/max check string length, **not numeric age or value bounds**. Unknown names
and malformed parameters throw configuration errors. Check `fails()` before
using `validated()`, which returns original values rather than sanitized data.

Debug registration does not create `/debug` or install an error hook. Production
disables diagnostics; custom log endpoints still need explicit gating.

Before going live, choose persistence, authentication, authorization, rate limits,
TLS/proxy policy, logging, backups, and the deployment host. These are application
responsibilities. The framework repository's checked recipes show integrations
without adding an ORM or auth engine to core.
