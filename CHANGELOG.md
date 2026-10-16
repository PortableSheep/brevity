# Changelog

Changes described here are source changes awaiting a registry release.
This file does not announce an npm publication or a signed release.

## Unreleased

### Added

- Small Node HTTP core with bounded body parsing, controlled errors, middleware,
  request-local dependency bindings, and optional standard TypeScript decorators.
- Optional escaped HTML/form helpers, Eta file views, native islands/enhanced
  forms, and a separate Svelte adapter.
- Detached `app.handler` for host-owned Node request/response integrations;
  `app.listen()` uses the same dispatch boundary.
- Runnable Vercel Node 22 example with raw-body configuration, bundled templates,
  static assets, and HTTP acceptance checks.
- Public documentation with checked integration recipes, Node 20/22/24 CI,
  browser tests, and clean packed-package consumer checks.
- Support/upgrade and private vulnerability-reporting policies.
- MIT license in the repository and each package, with repository/runtime metadata
  and packed-export, strict consumer-type and repeat-pack integrity checks.

### Changed

- Guides now lead with tasks and examples, with grouped navigation and expandable
  implementation details instead of repeated test inventories and caveats.

- Public documentation now leads with framework usage and deployment rather
  than project evaluation goals. The existing comparisons URL is preserved.
- Source formatting prioritizes readable statements and function spacing.

### Deployment boundaries

- Vercel Node integration also has separate application-level staging evidence
  for durable storage, authentication, expiry/refresh, provider-side restore and
  bounded traffic. The production checklist distinguishes local instrumented
  tests from user-observed hosted results. Capacity, cold starts, soak, PITR and
  rollback remain unproven; provider integrations remain application-owned.
- Lambda requires an HTTP adapter and has not been verified. Edge/Fetch
  runtimes are not supported.
