# Playwright E2E

**Tested:** @playwright/test 1.56.0, Chromium, Node.js 22.
The point is the acceptance contract: the server form works with JavaScript on
and off, and the island only enhances it.

## Start the fixture and wait for readiness

<<< @/samples/playwright.config.ts

This bounded fixture uses port 3107 and refuses to reuse an unrelated server.
The HTTP unit tests use ephemeral ports; Playwright's fixture has a configured
origin so the browser can navigate predictably.

## Exercise both experiences

<<< @/samples/e2e/notebook.spec.ts

Label/role locators exercise the accessible control markup. The no-JS test checks
the actual 422 response and retained value, not just the presence of a button.

```sh
npm run build:packages
npm run docs:check
npx playwright install chromium
npm run docs:e2e
```

On Linux CI, install browser system libraries with
`npx playwright install --with-deps chromium`; `.github/workflows/docs.yml`
does this before running the same tests.

Keep hosted sign-in/email tests in a provider-configured application suite.
Do not turn a mocked email endpoint into a claim of real Supabase E2E coverage.
