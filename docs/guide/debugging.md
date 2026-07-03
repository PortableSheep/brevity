# Debug Mode Guide

Brevity includes a lightweight debug plugin that **automatically activates in development mode**. It provides styled error pages, request logging, and a log viewer—all with minimal overhead.

## Auto-Enable in Development

Debug mode is automatically enabled when `NODE_ENV !== "production"`. Just run normally:

```bash
npm run dev
```

Debug is automatically **disabled** in production:

```bash
NODE_ENV=production npm start
```

## Manual Control

Override auto-detection if needed:

```typescript
import { DebugPlugin } from "@brevity/plugin-debug";
import { type DebugService } from "@brevity/plugin-debug";

app.usePlugin(new DebugPlugin({
  enabled: true,
  verbose: true
}));

const debug = new DebugService({ 
  enabled: true,  // Force on/off regardless of NODE_ENV
  verbose: true   // Enable debug-level logs
});
```

## Features

### Request Logging

When debug mode is enabled, the framework logs all requests with timestamps and response times:

```typescript
app.use(async (req, res, next, container) => {
  const debug = container?.get<DebugService>("debug");
  debug?.info(`Processing ${req.method} ${req.path}`);
  await next(req, res);
});
```

### Styled Error Pages

Unhandled errors render as styled HTML in development mode:

```typescript
app.use(async (req, res, next) => {
  try {
    await next(req, res);
  } catch (err) {
    const debug = app.container.get<DebugService>("debug");
    if (process.env.NODE_ENV !== "production") {
      debug?.renderErrorResponse(res, err as Error, { 
        path: req.path, 
        method: req.method 
      });
    }
  }
});
```

Features include:
- **Error message** clearly displayed
- **Stack trace** for debugging
- **Recent logs** showing context
- **Request information** for analysis
- **Dark theme** for less eye strain

### Log Levels

Available log levels: `info`, `warn`, `error`, `debug`

```typescript
debug?.info("User created", { user_id: 42 });
debug?.warn("Cache miss on expensive query", { query: "SELECT..." });
debug?.error("Connection failed", { host: "db.example.com" });
debug?.debug("Detailed state", { state: appState });  // Only logged if verbose=true
```

### Log Viewer Endpoint

Check recent logs via HTTP:

```typescript
app.router.get("/debug", (_req, res, container) => {
  const debug = container?.get<DebugService>("debug");
  res.json({
    debug_enabled: true,
    logs: debug?.getLogs(),
    recent: debug?.getLogs().slice(-10),
  });
});
```

Visit `http://localhost:3000/debug` to see:

```json
{
  "debug_enabled": true,
  "logs": [
    {
      "level": "info",
      "message": "GET /users",
      "timestamp": "2024-01-15T10:42:18.123Z",
      "data": { "duration_ms": 45 }
    }
  ]
}
```

## Configuration

```typescript
type DebugConfig = {
  enabled: boolean;        // Enable/disable debug features
  verbose?: boolean;       // Enable debug-level logs (default: false)
};

const debug = new DebugService({
  enabled: true,
  verbose: true
});
```

## Best Practices

1. **Disable in Production**: Always set `enabled: false` or leave it unset in production
2. **Conditional Registration**: Use environment checks in providers
   ```typescript
   container.singleton("debug", () => 
     new DebugService({ enabled: process.env.NODE_ENV !== "production" })
   );
   ```

3. **Log Meaningful Data**: Include context that helps debugging
   ```typescript
   debug?.info("User login", { user_id: 123, ip: req.ip });
   ```

4. **Clear Logs Periodically**: The debug service keeps up to 100 logs in memory
   ```typescript
   debug?.clear();  // Manually clear if needed
   ```

## Example: Error Handling with Debug

```typescript
app.router.post("/users", (req, res, container) => {
  try {
    const validation = req.validate({
      email: "required|email",
      name: "required|min:2"
    });
    
    if (validation.fails()) {
      const debug = container?.get<DebugService>("debug");
      debug?.warn("Validation failed", validation.errors());
      return res.status(422).json({ errors: validation.errors() });
    }
    
    const user = createUser(validation.validated());
    const debug = container?.get<DebugService>("debug");
    debug?.info("User created", { user_id: user.id });
    
    return res.json({ data: user });
  } catch (err) {
    const debug = container?.get<DebugService>("debug");
    debug?.error("Failed to create user", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});
```

## Log Retention

- **Max logs in memory**: 100 entries
- **Storage**: In-process only (not persisted)
- **Clearing**: Automatic when exceeding max, or manual with `clear()`

## When to Use Debug Mode

✅ **Use in development**:
- Debugging request handling
- Tracking validation issues
- Understanding middleware flow
- Performance profiling (check response times)

❌ **Don't use in production**:
- Memory overhead from log storage
- Sensitive data exposure in error pages
- Performance impact from logging

## Disabling for Tests

If debug output clutters test runs:

```typescript
const debug = new DebugService({ enabled: false });
```

Or in `package.json` scripts:

```json
{
  "scripts": {
    "dev": "tsx examples/app.ts",
    "test": "jest"
  }
}
```
