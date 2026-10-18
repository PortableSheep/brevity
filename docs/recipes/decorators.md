# Decorators or plain routes

Prefer route functions? Use them. Prefer controllers? Use standard TypeScript 5
decorators. Both run through the same router.

## Route functions

<<< @/samples/routes.ts#plain-routes

## Controller methods

<<< @/samples/routes.ts#controller-routes

Construct the controller yourself and pass it to `registerControllers(router, instance)`.
The [complete example](https://github.com/PortableSheep/brevity/blob/main/docs/samples/routes.ts)
uses the same greeting service and ID validation in both versions.

Import decorators from **`@portablesheep/brevity/decorators`**, not the default core
entry point. Leave legacy `experimentalDecorators` and `emitDecoratorMetadata`
disabled. Use public instance methods and keep request-specific state in locals:
one controller instance is reused across requests.

Both implementations explicitly register HEAD and map expected domain errors.
Run `npm run docs:check` to verify equivalent GET/HEAD/422 responses.
The [API reference](/api/core#optional-controller-decorators) covers inheritance,
path joining, and override semantics.
