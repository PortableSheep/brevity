# Decorators or plain routes

**Tested:** local @brevity/core 0.1.0, standard TypeScript 5.9 decorators,
Node.js 22. Both forms run through the same router.

<<< @/samples/routes.ts

`plainApp()` closes over an explicitly constructed service.
`decoratedApp()` registers an explicitly constructed controller with the same
service. Neither uses reflection, discovery, automatic DI, or a response mapper.

Import decorators from **`@brevity/core/decorators`**, not the default core
entry point. Leave legacy `experimentalDecorators` and `emitDecoratorMetadata`
disabled. Use public instance methods and keep request-specific state in locals:
one controller instance is reused across requests.

Both implementations explicitly register HEAD and map expected domain errors.
Run `npm run docs:check` to verify equivalent GET/HEAD/422 responses.
The [API reference](/api/core#optional-controller-decorators) covers inheritance,
path joining, and override semantics.
