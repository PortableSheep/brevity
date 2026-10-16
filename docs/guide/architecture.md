# How Brevity fits together

Brevity handles HTTP. Your database, authentication provider, and frontend tools
remain yours to choose.

## A request's path

```text
Match method and path
  -> Create request and response wrappers
  -> Set request-local container bindings
  -> Boot providers (once)
  -> Parse the body
  -> Run middleware
  -> Run the route, or return 404
```

Failures go to the error handler. Responses are explicit: the handler sends JSON,
HTML, or a redirect rather than returning a value for the framework to interpret.

Body parsing happens **before middleware**. Raw-stream integrations need
`parseBody: false` and their own size limits.

## Add only what you need

- **Core:** routes, parsing, responses, errors, and dependency injection. No external runtime dependencies.
- **Web and views:** optional HTML helpers, forms, static assets, and Eta templates.
- **Islands:** optional browser components and form enhancement, with a separate Svelte adapter.
- **Your app:** data models, validation rules, auth, access control, and deployment.

Dependencies are passed explicitly. The container also provides async-local
`request` and `response` bindings, so concurrent requests don't overwrite each
other. Singleton services still stay singletons; don't store request data on them.

See the [core reference](/api/core) for exact behavior or [recipes](/recipes/)
for integrations.
