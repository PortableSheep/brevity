# @brevity/islands-svelte

Svelte 5 adapter for `@brevity/islands`. Install it only when an island uses
Svelte; `@brevity/islands` itself has no Svelte peer, so native-only apps never
pull Svelte into their production dependency graph.

```ts
import { svelteIsland } from "@brevity/islands-svelte";
import Counter from "./Counter.svelte";
export default svelteIsland(Counter);
```

`svelteIsland(Component)` mounts into a new container (replacing the fallback
only after mount succeeds) and unmounts on disposal. Islands are usually
prebuilt by Vite; if Svelte is only needed at build time, keep this package and
`svelte` in `devDependencies`.
