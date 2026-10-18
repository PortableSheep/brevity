# Sample App Walkthrough

The sample app uses `examples/app.ts` as a thin entrypoint. The real wiring lives in `examples/bootstrap.ts` and the feature folders under `examples/`:

- Provider registration
- Middleware
- Validation
- Cache usage
- View rendering

## Routes

| Route               | Purpose                       |
| ------------------- | ----------------------------- |
| `GET /`             | Render HTML via viewer        |
| `GET /health`       | Health and uptime             |
| `GET /users`        | List in-memory users          |
| `GET /users/{i:id}` | Get one user by id            |
| `POST /users`       | Validate + create user        |
| `GET /stats`        | Read request count from cache |

## Try it

```bash
npm run dev
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/users
curl -X POST http://127.0.0.1:3000/users \
  -H "content-type: application/json" \
  -d '{"email":"new@brevity.test","name":"New User"}'
```

Imports come from the workspace packages:

```ts
import { createApp } from "@portablesheep/brevity";
import { DebugPlugin } from "@portablesheep/brevity-plugin-debug";
```
