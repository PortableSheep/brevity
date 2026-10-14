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

### Changed

- Public documentation now leads with framework usage and deployment rather
  than project evaluation goals. The existing comparisons URL is preserved.
- Source formatting prioritizes readable statements and function spacing.

### Deployment boundaries

- Vercel's Node integration is verified with synthetic HTTP traffic; persistence,
  real authentication, cold-start/load measurements, and operational drills
  remain application-specific work.
- Lambda requires an HTTP adapter and has not been verified. Edge/Fetch
  runtimes are not supported.
