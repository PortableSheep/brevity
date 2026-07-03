# Brevity Starter Template

A minimal, production-ready starter template for building web apps with Brevity.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm build
npm start
```

Then visit **http://127.0.0.1:3000**

## Project Structure

```
src/
  └── index.ts          # Entry point, routes, and app setup
views/
  └── index.html        # HTML templates
package.json           # Dependencies and scripts
tsconfig.json          # TypeScript configuration
```

## Adding Routes

Routes are defined in `src/index.ts`. Add a new route:

```typescript
app.router.get("/about", (_req, res) => {
  res.send("<h1>About</h1><p>Learn more about us.</p>");
});

app.router.post("/submit", (req, res, container) => {
  const validator = container?.get("validator");
  const validation = validator?.validate(req.body ?? {}, {
    email: "required|email",
  });

  if (validation?.fails()) {
    return res.status(422).json({ errors: validation.errors() });
  }

  res.json({ success: true });
});
```

## Using the Viewer (Templates)

Use the **Viewer** plugin to render HTML templates with variables:

```typescript
app.router.get("/users", (_req, res, container) => {
  const viewer = container?.get("viewer");
  const html = viewer?.render("users.html", {
    users: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ],
  });
  res.send(html ?? "No users");
});
```

In `views/users.html`:

```html
<h1>Users</h1>
<ul>
  {{ users.forEach(user => { }}
    <li>{{ user.name }} (ID: {{ user.id }})</li>
  {{ }) }}
</ul>
```

## Using Cache

Access the cache through the container:

```typescript
app.router.get("/data", (_req, res, container) => {
  const cache = container?.get("cache");
  
  let data = cache?.get("my-data");
  if (!data) {
    data = fetchExpensiveData();
    cache?.set("my-data", data, 3600); // Cache for 1 hour
  }
  
  res.json({ data });
});
```

## Validation

Validate request data before processing:

```typescript
const validator = container?.get("validator");
const validation = validator?.validate(req.body, {
  email: "required|email",
  password: "required|min:8",
  age: "required|integer|min:18",
});

if (validation?.fails()) {
  return res.status(422).json({
    errors: validation.errors(),
  });
}
```

## Environment

Set `NODE_ENV=production` to disable debug mode:

```bash
NODE_ENV=production npm start
```

## Next Steps

- Read the [Brevity documentation](../docs/)
- Check out the [full example app](../examples/)
- Explore the [API reference](../docs/api/)
