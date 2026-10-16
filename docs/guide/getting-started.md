# Getting started

Brevity is a small TypeScript framework for APIs and server-rendered apps.
You write routes; it handles the HTTP plumbing.

## Run an example

Use Node 22 or 24. Clone the repository and install its dependencies:

```sh
git clone https://github.com/PortableSheep/brevity.git
cd brevity
npm ci
npm run dev
```

Open **http://127.0.0.1:3000**. This example includes routes, plugins, and views.
Stop it with Ctrl+C before trying another example on the same port.

::: info Package availability
Brevity isn't published to npm yet. Use this checkout for now, or follow the
[local package instructions](https://github.com/PortableSheep/brevity/blob/main/QUICK_START.md#option-2-use-the-existing-starter-template)
for a separate app.
:::

## Your first route

An app starts with `createApp()` and a handler:

<<< @/samples/first-route.ts

The handler receives a request and response. Call `res.json()` or `res.send()`
to reply; returning a value doesn't send it.

Keep startup in a separate file so tests can import the app without opening a port:

<<< @/samples/first-route-start.ts

Run this smaller example from the repository root:

```sh
npm run build:packages
node --import tsx docs/samples/first-route-start.ts
```

Visit **http://127.0.0.1:3000** to see `{"message":"Hello, Brevity"}`.
The server binds to loopback by default.

## Choose your next step

- [Build a notebook](./tutorial): HTML pages, form validation, and SQLite.
- [Add decorators](/recipes/decorators): group routes into controller classes.
- [Connect other tools](/recipes/): databases, authentication, browser components, and tests.

For your own project, use ESM and strict TypeScript. Decorators use TypeScript 5's
standard syntax; leave `experimentalDecorators` and `emitDecoratorMetadata` off.
