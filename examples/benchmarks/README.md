# Synthetic HTTP comparison

Benchmark-only dependencies live here, never in framework runtime packages.
The fixtures use public Brevity, Express, Fastify, and Nest APIs; Nest uses its
normal Express adapter. The JavaScript fixture applies Nest's public decorators
as functions because there is no TypeScript compilation in this harness.

From the repository root:

```sh
npm run build:packages
cd examples/benchmarks
npm install
npm run bench > measurements.json
```

After the lockfile exists, use `npm ci`. Logs go to stderr; stdout is JSON.
`REPEATS`, `DURATION_MS`, `WARMUP_MS`, and `CONCURRENCY` are positive integers.
Use `CONCURRENCY=1` and then 16/64 for different contention levels. Each measured
scenario gets a fresh child process; framework order rotates between repeats.

Each fixture serves the same JSON GET and echoes the same valid object POST.
All use a 1 MiB parser limit for POST. Brevity and Express/Fastify return 200;
Nest's ordinary POST response is 201. Authentication, invalid-body semantics,
domain logic, templates, validation, and persistence are deliberately absent:
this is a small-route overhead comparison, not an equivalent production app.

The report includes all repeats, request counts, elapsed throughput, client
p50/p95/p99 latency, child process-to-ready time, import-to-listen time, sampled
peak server RSS, and server event-loop p99. Startup includes a fresh process,
not a cold filesystem cache. RSS samples are not total system memory. Event-loop
metrics include warmup and measurement. Dependencies and exact runtime/machine
are recorded. Only successful, verified responses count; any failure aborts.

The closed-loop load generator runs on the same machine as the server and can
be the bottleneck. Results do not establish capacity, internet latency, tail
behavior under overload, or soak stability. Run on an otherwise idle dedicated
machine for publishable comparisons and publish losses as well as wins.
