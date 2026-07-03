# Getting Started

## Requirements

- Node.js 20+
- npm 10+

## Install and run

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:3000`.

## Project layout

```text
src/
  core/
    container.ts
    provider.ts
    router.ts
    request.ts
    validation.ts
    response.ts
    viewer.ts
    plugin.ts
packages/
  core/
    src/index.ts
  plugin-cache/
    src/index.ts
  plugin-debug/
    src/index.ts
  plugin-viewer/
    src/index.ts
  plugin-validation/
    src/index.ts
examples/
  app.ts
  bootstrap.ts
  middleware/
    example-middleware.ts
  providers/
    app-provider.ts
  routes/
    example-routes.ts
  services/
    user-service.ts
  support/
    debug-view.ts
  views/home.html
  views/debug.html
test/
  *.test.ts
docs/
```

## Verify quality

```bash
npm run typecheck
npm run test
npm run build
```

## Optional features

Use plugins for the non-core pieces:

- `CachePlugin`
- `ViewerPlugin`
- `DebugPlugin`
- `ValidationPlugin`

See [Plugins](/guide/plugins) for the full split.
