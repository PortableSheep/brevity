# Size and performance

Brevity aims to keep framework overhead small. Here are the measurements we have,
the code behind them, and what they can tell you.

## Dependencies

Core and web have no external runtime dependencies. Views adds Eta 3.5.0;
native islands adds no external runtime dependency. Svelte is a peer of the
separate Svelte adapter, not part of native islands.

Count your app's database client, auth SDK, and browser runtime too. A small
framework doesn't remove those costs.

## Second application: support inbox

The [support inbox example](https://github.com/PortableSheep/brevity/tree/main/examples/support-inbox)
implements the same app in Brevity and Express 5.1.0: validated forms, persistent
requests, details, search, pagination, and status updates. Both work without
JavaScript and share the business logic.

| Authored source                      | Brevity | Express |
| ------------------------------------ | ------: | ------: |
| Routes and templates, nonblank lines |     117 |     150 |
| Whole runnable app, nonblank lines   |     309 |     342 |
| Whole runnable app, bytes            |  17,271 |  19,593 |

That's **33 fewer nonblank lines** in this example, mostly HTML/form glue.
It's a modest reduction, not a claim that all Brevity apps take less code or time.
Both serve the same 322-byte browser script. The local store is single-process
and the example has no authentication.

::: details Reproduce the source comparison
From `examples/support-inbox`, after installing and building packages:

```sh
npm run typecheck
npm run build
npm test
npm run smoke
node scripts/measure.mjs | cmp - measurements.json
```

The [results](https://github.com/PortableSheep/brevity/blob/main/examples/support-inbox/RESULTS.md)
include the file inventory, versions, dependency graph, and counting rules.
Each app total includes shared code once. Generated output, dependencies,
lockfiles, and runtime data aren't counted as authored source. With common build
configuration included, totals are 359 nonblank lines for Brevity and 392 for Express.

Report bytes alongside lines: compressed templates and CSS can hide a lot of
code on one line. Blank lines improve readability and aren't a cost to eliminate.
:::

## Synthetic HTTP benchmark

Small JSON routes were measured against Express 5.3.0, Fastify 5.12.5, and Nest
12.1.2 using its Express adapter:

| Framework | GET requests/s | POST requests/s |  GET p95 |
| --------- | -------------: | --------------: | -------: |
| Brevity   |         41,800 |          38,857 | 0.637 ms |
| Express   |         16,542 |          14,311 | 1.745 ms |
| Fastify   |         40,937 |          38,793 | 0.672 ms |
| Nest      |         14,955 |          13,005 | 1.927 ms |

Brevity and Fastify had similar small-route throughput in this local run.
Fastify used less sampled memory. These routes don't include a database, auth,
templates, or overload, so **don't use these numbers to size a production app**.

::: details Machine, method, and full report
The snapshot used Node 22.21.1 on an Apple M1 Max running macOS ARM64. Each
scenario started a new process, warmed up for 500 ms, and measured for two seconds
with 16 concurrent keep-alive clients. Values above are medians of three
rotated-order runs. The client ran on the same machine as the servers.

| Framework | Median process-to-ready | Maximum sampled RSS |
| --------- | ----------------------: | ------------------: |
| Brevity   |                 50.2 ms |            91.5 MiB |
| Express   |                 71.1 ms |           126.6 MiB |
| Fastify   |                 96.8 ms |            79.8 MiB |
| Nest      |                237.0 ms |           176.0 MiB |

Startup includes process creation, imports, and listening, not cold filesystem
caches. RSS is the child process's sampled peak. Startup/RSS combine both methods
and all repeats. Brevity POST runs ranged from 34,091 to 40,508 requests/s,
including a run below Fastify. Nest returns 201 for POST; the others return 200.

See the [benchmark README](https://github.com/PortableSheep/brevity/blob/main/examples/benchmarks/README.md)
for commands and the JSON report with individual runs, p50/p95/p99, event-loop
delay, machine details, versions, and compiled-source hashes. Responses are
checked; failures abort the run. A shared machine and short closed-loop run
limit how much we can infer.
:::

## Test your workload

Compare equivalent behavior: the same validation, errors, escaping, storage,
and browser experience. Include templates, configuration, and client code when
comparing source. Measure development time with real developers, not line counts.

For hosted application results and outstanding load/recovery checks, see
[production readiness](./production-readiness).
